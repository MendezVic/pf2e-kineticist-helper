<script lang="ts">
  import type { ExampleApp } from '@/ui/ExampleApp';
  import RuneGoblinBadge from './RuneGoblinBadge.svelte';

  let { app }: { app: ExampleApp } = $props();
  let count = $state(0);
</script>

<div class="example">
  <header class="brand">
    <RuneGoblinBadge />
  </header>
  <p>Svelte {count === 1 ? 'click' : 'clicks'}: <strong>{count}</strong></p>
  <div class="row">
    <button type="button" onclick={() => count++}>Increment</button>
    <button type="button" onclick={() => app.close()}>Close</button>
  </div>
</div>

<style>
  .example {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .brand {
    display: flex;
    justify-content: flex-end;
  }
  .row {
    display: flex;
    gap: 0.5rem;
  }
</style>
