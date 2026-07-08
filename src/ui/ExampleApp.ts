import { mount, unmount } from 'svelte';
import Example from './components/example/Example.svelte';

const { ApplicationV2 } = foundry.applications.api;

export class ExampleApp extends ApplicationV2 {
  static override DEFAULT_OPTIONS = {
    id: 'pf2e-module-template-example',
    tag: 'section',
    classes: ['pf2e-module-template'],
    window: { title: 'pf2e-module-template.title', icon: 'fa-solid fa-flask', resizable: false },
    position: { width: 420, height: 'auto' as const },
  };

  #component?: ReturnType<typeof mount>;
  #root?: HTMLElement;

  static open(): ExampleApp {
    const app = new ExampleApp();
    app.render({ force: true });
    return app;
  }

  // AppV2 runs _renderHTML on every render; mount once and reuse the node, so a
  // re-render neither leaks a second component (the first is never unmounted) nor
  // discards Svelte's reactive state. Svelte drives all updates from here.
  protected override async _renderHTML(): Promise<HTMLElement> {
    if (!this.#component) {
      this.#root = document.createElement('div');
      this.#component = mount(Example, { target: this.#root, props: { app: this } });
    }
    return this.#root!;
  }

  protected override _replaceHTML(result: HTMLElement, content: HTMLElement): void {
    content.replaceChildren(result);
  }

  protected override async _preClose(): Promise<void> {
    if (this.#component) {
      unmount(this.#component);
      this.#component = undefined;
      this.#root = undefined;
    }
  }
}
