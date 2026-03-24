# Output Specifications

The pipeline is the primary artifact. The probe notebook validates assumptions before committing GPU hours. The design spec is reference documentation, not the deliverable.

## 1. Runnable Pipeline (Primary Output)

A complete, self-contained pipeline the user can pull onto their training infrastructure and run.

### Contents

- **Training/processing scripts** — Main entrypoint(s) with configuration. Varies by use case: `train.py`, `quantize.py`, `generate.py`, `process.py`.
- **Configuration** — Hyperparameters, model config, data paths. Externalized from code so the user can adjust without editing scripts.
- **Dockerfile and/or docker-compose.yml** — Containerized environment with all dependencies pinned:
  - Base image with CUDA/GPU drivers as appropriate
  - All Python dependencies
  - Entrypoint configured for the task
  - Volume mounts for data and output artifacts
- **Evaluation harness** — Scripts to run the evaluation plan (metrics, baselines, benchmarks).
- **README with run instructions** — How to build, configure, and run. Hardware requirements. Expected outputs.

### Infrastructure Scope

| Scenario | Output | In scope? |
|----------|--------|-----------|
| Single node, 1-8 GPUs | Dockerfile + `torchrun` | Yes (default) |
| Multi-node, homogeneous cluster | Same Dockerfile + K8s Job/PyTorchJob manifest | Yes |
| Cluster provisioning (EKS, GKE, RunPod setup) | — | No, flag it |
| Heterogeneous GPUs, custom autoscaling | — | No, flag it |
| Managed platforms (SageMaker, Vertex AI) | — | No, flag it |

**Single-node multi-GPU (default):** Dockerfile configured with `torchrun` or equivalent launcher, NCCL environment variables, GPU device mapping. The user runs one container on a machine with N GPUs.

**Multi-node distributed (Kubernetes):** When Training Strategy identifies multi-node needs:
- Same Dockerfile as single-node (training code is identical)
- Kubernetes `Job` manifest, or `PyTorchJob` manifest (if cluster has Kubeflow training operator)
- `PersistentVolumeClaim` for shared data and checkpoint storage
- Resource requests for GPU allocation (`nvidia.com/gpu`)
- NCCL environment variables for inter-node communication
- Connectivity validation pod (NCCL all-reduce test) to run before the real job

The training code doesn't change between single-node and multi-node — only the orchestration layer does.

**Pre-existing environments:** If the user's infrastructure provides a pre-configured environment (RunPod template, HPC module system, managed notebook service), generate scripts and configs targeting that environment instead of a Dockerfile. The training code is the same — only the packaging changes.

**Out of scope for infrastructure** (flag if relevant):
- Cluster provisioning itself (setting up EKS/GKE/RunPod cluster)
- Heterogeneous GPU scheduling (mixed GPU types across nodes)
- Custom autoscaling or spot instance management
- Managed training platforms (SageMaker, Vertex AI, Azure ML) — different APIs entirely

### Directory Structure

For greenfield projects:

```
<project-root>/
├── pipeline/
│   ├── train.py              # (or process.py, quantize.py, generate.py)
│   ├── eval.py
│   ├── config.yaml
│   ├── Dockerfile
│   ├── k8s/                  # (only if multi-node)
│   │   ├── job.yaml
│   │   └── pvc.yaml
│   ├── requirements.txt
│   └── README.md             # Run instructions, hardware reqs, expected outputs
├── notebooks/
│   └── probes.ipynb
└── docs/
    └── ml-pipeline-design.md
```

`pipeline/` is self-contained — can be copied to a remote machine or built as a Docker image without dragging along notebooks and docs.

### Adapting to Existing Projects

The directory structure above is for greenfield projects. For existing projects, adapt the output format:

- **Existing code at root** — Ask: "I see existing training code at the project root. Should I add to it in place, or create a `pipeline/` directory?" If directories like `pipeline/` or `notebooks/` already exist, ask before writing into them.
- **Single-file projects** — Some projects are intentionally single-file (competition entries, self-contained scripts, notebooks). Don't impose a directory structure — produce modifications to the existing file. The design spec and probes are still separate files, but the pipeline output is changes to what exists.
- **Monorepos / complex layouts** — Respect the existing structure. Ask where pipeline outputs should live.

---

## 2. Feasibility Probe Notebook (Secondary Output)

A Jupyter notebook (`.ipynb`) or Python script for validating assumptions at low cost before committing full GPU hours.

### Typical Probe Contents

- Data loading, shape inspection, label distribution
- Missing value and quality profiling
- Base model loading and basic inference test
- Latency and memory benchmarking (if deployment constraints exist)
- Library and driver compatibility checks
- K8s connectivity validation pod with NCCL all-reduce test (if multi-node)

### Generation Strategy

The notebook is generated incrementally — probes are written as the relevant section is designed. During the session, offer to run individual probes ("Want me to run this now?") to inform the design in real-time. Results feed back into `probeResults` in the durable state.

**The probe notebook is the "run this first" artifact.** It catches problems (wrong data format, model doesn't fit in memory, K8s nodes can't communicate) before they burn GPU hours.

---

## 3. Design Spec Document (Reference Output)

A structured markdown file saved to the project (default: `docs/ml-pipeline-design.md`).

### Contents

- Problem definition and success criteria
- Decisions for each active section with rationale
- Rejected alternatives and why
- Evaluation plan with metrics, baselines, and thresholds
- Pipeline architecture diagram (text-based)
- Known risks and open questions

This is the *why* behind the pipeline. When someone asks "why did we use LoRA instead of full fine-tuning?" six months later, the answer is here.

### Generation

Compile from the durable state — all decisions, rationale, and rejected alternatives are already captured. Format into a readable document with clear section headings.

---

## Output Generation Phases

Update the state phase as you generate each output:

1. `generating-pipeline` — Write scripts, configs, Dockerfile, eval harness, README
2. `generating-probes` — Compile probe notebook from probes generated during the session (plus any remaining probes)
3. `generating-spec` — Compile design spec from state decisions and rationale
4. `complete` — All outputs written. Delete `.ml-pipeline-state.json`.
