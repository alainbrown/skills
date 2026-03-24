# Section Catalog

The skill draws from 12 possible sections. After Problem Definition, activate or skip sections based on the use case. Techniques listed in parentheses are illustrative examples — the LLM and MCP provide current recommendations.

## Section Descriptions

### 1. Problem Definition
**Always active.** What are you solving and why? Business context, success criteria, constraints.

Questions to explore:
- What is the task? (classification, generation, retrieval, ranking, etc.)
- What does success look like? (metrics, thresholds, latency, cost)
- What constraints exist? (hardware, budget, timeline, regulatory, data privacy)
- What's been tried before? What worked, what didn't?
- Is this a one-time model or an ongoing retraining pipeline?
- Who will use the model and how? (internal tool, customer-facing API, edge device)

### 2. Data Audit
What data exists? Inspect the codebase — formats, volume, quality, labeling status, access constraints.

Questions:
- What datasets are available? (grounded in codebase scan findings)
- What's the label distribution? Class imbalance?
- Data quality issues? Missing values, noise, duplicates?
- How was the data collected? Any selection bias?
- Access constraints? PII, licensing, data residency?

Probe opportunities: Data profiling (shape, dtypes, missing values, label distribution, duplicates).

### 3. Data Sourcing & Curation
Where to get more data. Dataset creation, synthetic data, annotation pipelines, data versioning.

Questions:
- What's the target dataset size?
- Quality bar — human-written, human-validated synthetic, or fully synthetic?
- Existing public datasets to build on or differentiate from?
- Target format — instruction/response pairs, multi-turn, preference pairs?
- Annotation workflow — who annotates, what tools, what quality checks?

### 4. Preprocessing & Feature Engineering
Cleaning strategy, transforms, tokenization, embeddings, feature extraction.

Questions:
- What preprocessing does the data need? (text: tokenization, normalization; images: resizing, augmentation; tabular: encoding, scaling)
- Existing preprocessing code to reuse?
- Feature engineering opportunities? (domain-specific features, embeddings)
- Data augmentation strategy?

### 5. Model Selection
Architecture choice, pretrained base model selection, trade-offs (accuracy vs. latency vs. interpretability vs. cost).

Questions:
- What model families are candidates? (grounded in problem type and constraints from section 1)
- What's the inference latency budget?
- What hardware will inference run on?
- Interpretability requirements?
- Existing model weights or checkpoints to start from?

Probe opportunities: Model loading test, inference latency benchmark, VRAM estimation.

MCP: Use Context7 for current model benchmarks. Use Playwright to browse HuggingFace model cards if available.

### 6. Model Adaptation Strategy
Fine-tuning approach — full fine-tuning, LoRA, QLoRA, prompt tuning, RLHF/DPO, adapter strategies.

Questions:
- Dataset size relative to model size — does this warrant full fine-tuning?
- VRAM constraints during training?
- Need to preserve base model capabilities (catastrophic forgetting concerns)?
- Multiple task-specific adaptations from one base?

Depends on: Section 1 (constraints), Section 5 (model choice).

### 7. Training Strategy
Hardware, hyperparameters, experiment tracking, checkpointing, distributed training, cost estimation.

Questions:
- What hardware is available? (GPU type, count, multi-node?)
- Budget for compute?
- Experiment tracking preferences? (e.g., W&B, MLflow, TensorBoard)
- Checkpointing strategy — frequency, storage?
- Distributed training needs? (data parallel, model parallel, pipeline parallel)

Cost estimation: Calculate estimated GPU-hours and cost based on model size, dataset size, and hardware choice. Present as a concrete number, not a hand-wave.

Depends on: Section 1 (constraints), Section 5 (model), Section 6 (adaptation approach).

### 8. Optimization & Efficiency
Quantization, distillation, pruning, mixed precision, cost/performance trade-offs.

Questions:
- What's the deployment target hardware and VRAM?
- Acceptable quality degradation? (perplexity increase, accuracy drop)
- Format requirements downstream? (GGUF for llama.cpp, GPTQ for vLLM, AWQ, ONNX)
- Calibration data available for quantization?

Probe opportunities: Baseline perplexity/accuracy measurement, VRAM estimation after quantization.

Depends on: Section 1 (constraints), Section 5 (model).

### 9. Evaluation Plan
Metrics, baselines, validation scheme, benchmarks, success thresholds, failure modes.

Questions:
- What metrics matter most? (accuracy, F1, perplexity, BLEU, human eval, latency)
- What baselines to compare against? (existing system, off-the-shelf model, random)
- Validation scheme? (k-fold, held-out test set, temporal split)
- Standard benchmarks to include? (domain-specific + general)
- What does failure look like? How will you know the model isn't working?

Depends on: Section 1 (success criteria), Section 5 (model), Section 6 (adaptation), Section 7 (training).

### 10. Pipeline Architecture
Orchestration, artifact storage, reproducibility, dependency management.

Questions:
- Single script or orchestrated pipeline? (depends on complexity)
- Artifact storage? (model checkpoints, datasets, logs)
- Reproducibility requirements? (seed fixing, config versioning, data versioning)
- CI/CD for model training?

Depends on: Section 1, Section 7 (training infrastructure).

### 11. Deployment & Serving
Inference strategy, model serving, monitoring, drift detection, retraining triggers.

Questions:
- How will the model be served? (API endpoint, batch processing, edge device, embedded)
- Latency and throughput requirements?
- Monitoring — what to track in production? (prediction distribution, latency, errors)
- Drift detection strategy?
- Retraining triggers — scheduled, performance-based, data-volume-based?

Depends on: Section 1 (constraints), Section 5 (model), Section 8 (optimization).

### 12. Iteration Protocol
What to try next when results fall short. Ablation strategy, experiment prioritization.

Questions:
- What's the experiment prioritization framework? (cheapest/fastest changes first)
- Ablation plan — which components to isolate?
- Decision criteria for pivoting approaches?
- Stop conditions — when to declare the current approach insufficient?

Depends on: Section 1, Section 9 (evaluation results).

---

## Section Activation by Use Case

Identified during Problem Definition. These are starting points — the user can activate or skip any section.

| Use Case | Active Sections |
|----------|----------------|
| Fine-tuning a pretrained model | 1, 2, 4, 5, 6, 7, 9, 10, 11, 12 |
| Creating / curating a dataset | 1, 2, 3, 4, 9, 10 |
| Quantizing an existing model | 1, 5, 8, 9, 11 |
| Pretraining from scratch | 1, 2, 3, 4, 5, 7, 9, 10, 11, 12 |
| Cost/performance optimization | 1, 7, 8, 9, 12 |
| RAG / retrieval pipeline | 1, 2, 4, 5, 9, 10, 11 |
| Competitive / research optimization | 1, 5, 7, 8, 9, 12 |

---

## Section Walkthrough Pacing

Each section follows this rhythm:

1. **Read state** — refresh context on prior decisions
2. **Ask 2-3 targeted questions** — grounded in codebase and prior decisions. Batch them.
3. **Draft recommendation** — lead with recommendation + rationale, then alternatives
4. **User decides** — accept, override, or skip
5. **Update state** — decisions, rationale, rejected alternatives
6. **Offer probes** — if a question can be answered by running code, offer it

The pacing is section-based: a few questions, then a recommendation. Not one question at a time (too slow for experts) and not a giant dump (loses interactivity).

When a section depends on a skipped section, treat the dependency as satisfied — address the relevant concerns inline. If scope grows, recommend activating the depended-on section instead.
