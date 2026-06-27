#!/usr/bin/env bash

for node_dir in /usr/local/opt/node@22/bin /opt/homebrew/opt/node@22/bin; do
  if [ -x "$node_dir/node" ]; then
    export PATH="$node_dir:$PATH"
    break
  fi
done
