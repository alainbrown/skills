/**
 * InputBar — bottom-pinned text input.
 *
 * Disabled while the agent is streaming. The submit handler is fired on Enter.
 * Ctrl-C cancellation is handled at the App level (not here) so that a Ctrl-C
 * with an empty input doesn't accidentally fire submit.
 */

import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export type InputBarProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  disabled?: boolean;
};

export function InputBar({
  value,
  onChange,
  onSubmit,
  disabled,
}: InputBarProps): React.JSX.Element {
  return (
    <Box>
      <Text bold color={disabled ? 'gray' : 'cyan'}>agent&gt; </Text>
      {disabled ? (
        <Text dimColor>(streaming — Ctrl-C to interrupt)</Text>
      ) : (
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="type a message"
        />
      )}
    </Box>
  );
}
