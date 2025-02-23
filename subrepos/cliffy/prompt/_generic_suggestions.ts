import type { KeyCode } from "../keycode/key_code.ts";
import {
  GenericInput,
  GenericInputKeys,
  GenericInputPromptOptions,
  GenericInputPromptSettings,
} from "./_generic_input.ts";
import {
  bold,
  brightBlue,
  green,
  cyan,
  dim,
  dirname,
  join,
  normalize,
  stripColor,
  underline,
  reset,
} from "./deps.ts";
import { Figures, getFiguresByKeys } from "./_figures.ts";
import { distance } from "../_utils/distance.ts";
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.7.1.1/array.js"

/** Generic input prompt options. */
export interface GenericSuggestionsOptions<TValue, TRawValue>
  extends GenericInputPromptOptions<TValue, TRawValue> {
  /** Keymap to assign key names to prompt actions. */
  keys?: GenericSuggestionsKeys;
  /**
   * Prompt id. If set, the prompt value is stored in local storage and used for
   * auto suggestions the next time the prompt is used.
   */
  id?: string;
  /**
   * An array of suggestions or a callback function that returns an array of
   * suggestions.
   */
  suggestions?: Array<string | number> | SuggestionHandler;
  /**
   * An array of extra information for each description
   */
  suggestionDescriptions?: Array<string>;
  /**
   * will consider submission to be a completing value
   */
  completeOnSubmit?: boolean;
  /** Callback function for auto-suggestion completion. */
  complete?: CompleteHandler;
  /**
   * Enable autosuggestions for files. Can be a boolean to enable all files or a
   * regular expression to include only specific files.
   */
  files?: boolean | RegExp;
  /** Show auto suggestions as a list. */
  list?: boolean;
  /** Display prompt info. */
  info?: boolean;
  /** Change list pointer. Default is `brightBlue("❯")`. */
  listPointer?: string;
  /** Limit max displayed rows per page. */
  maxRows?: number;
}

/** Generic input prompt settings. */
export interface GenericSuggestionsSettings<TValue, TRawValue>
  extends GenericInputPromptSettings<TValue, TRawValue> {
  keys?: GenericSuggestionsKeys;
  id?: string;
  suggestions?: Array<string | number> | SuggestionHandler;
  suggestionDescriptions?: Array<string>;
  completeOnSubmit?: boolean;
  complete?: CompleteHandler;
  files?: boolean | RegExp;
  list?: boolean;
  info?: boolean;
  listPointer: string;
  maxRows: number;
}

/** Input keys options. */
export interface GenericSuggestionsKeys extends GenericInputKeys {
  /** Apply auto-suggestion keymap. Default is `["tab"]`. */
  complete?: string[];
  /** Select next option keymap. Default is `["up"]`. */
  next?: string[];
  /** Select previous option keymap. Default is `["down"]`. */
  previous?: string[];
  /** Select next page keymap. Default is `["pageup"]`. */
  nextPage?: string[];
  /** Select previous page keymap. Default is `["pagedown"]`. */
  previousPage?: string[];
}

/** Auto-suggestions handler. */
export type SuggestionHandler = (
  input: string,
) => Array<string | number> | Promise<Array<string | number>>;

/** Auto-suggestions complete handler. */
export type CompleteHandler = (
  input: string,
  suggestion?: string,
) => Promise<string> | string;

interface LocalStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const sep = Deno.build.os === "windows" ? "\\" : "/";

let selectedWithArrowKeys
/** Generic input prompt representation. */
export abstract class GenericSuggestions<TValue, TRawValue>
  extends GenericInput<TValue, TRawValue> {
  protected abstract readonly settings: GenericSuggestionsSettings<
    TValue,
    TRawValue
  >;
  protected suggestionsIndex = -1;
  protected suggestionsOffset = 0;
  protected suggestions: Array<string | number> = [];
  protected suggestionDescriptions: Array<string> = [];
  #hasReadPermissions?: boolean;

  public getDefaultSettings(
    options: GenericSuggestionsOptions<TValue, TRawValue>,
  ): GenericSuggestionsSettings<TValue, TRawValue> {
    const settings = super.getDefaultSettings(options);
    return {
      completeOnSubmit: false,
      ...settings,
      listPointer: options.listPointer ?? brightBlue(Figures.POINTER),
      maxRows: options.maxRows ?? 8,
      keys: {
        submit: ["enter", "return"],
        complete: ["tab"],
        next: ["up"],
        previous: ["down"],
        nextPage: ["pageup"],
        previousPage: ["pagedown"],
        ...(settings.keys ?? {}),
      },
    };
  }

  protected get localStorage(): LocalStorage | null {
    // Keep support for deno < 1.10.
    if (this.settings.id && "localStorage" in window) {
      try {
        // deno-lint-ignore no-explicit-any
        return (window as any).localStorage;
      } catch (_) {
        // Ignore error if --location is not set.
      }
    }
    return null;
  }

  protected loadSuggestions(): Array<string | number> {
    if (this.settings.id) {
      const json = this.localStorage?.getItem(this.settings.id);
      const suggestions: Array<string | number> = json ? JSON.parse(json) : [];
      if (!Array.isArray(suggestions)) {
        return [];
      }
      return suggestions;
    }
    return [];
  }

  protected saveSuggestions(...suggestions: Array<string | number>): void {
    if (this.settings.id) {
      this.localStorage?.setItem(
        this.settings.id,
        JSON.stringify([
          ...suggestions,
          ...this.loadSuggestions(),
        ].filter(uniqueSuggestions)),
      );
    }
  }

  protected async render(): Promise<void> {
    if (this.settings.files && this.#hasReadPermissions === undefined) {
      const status = await Deno.permissions.request({ name: "read" });
      // disable path completion if read permissions are denied.
      this.#hasReadPermissions = status.state === "granted";
    }
    await this.match();
    return super.render();
  }

  protected async match(): Promise<void> {
    this.suggestions = await this.getSuggestions();
    this.suggestionsIndex = Math.max(
      this.getCurrentInputValue().trim().length === 0 ? -1 : 0,
      Math.min(this.suggestions.length - 1, this.suggestionsIndex),
    );
    this.suggestionsOffset = Math.max(
      0,
      Math.min(
        this.suggestions.length - this.getListHeight(),
        this.suggestionsOffset,
      ),
    );
  }

  protected input(): string {
    return super.input() + dim(this.getSuggestion());
  }

  protected getSuggestion(): string {
    return this.suggestions[this.suggestionsIndex]?.toString()
      .substr(
        this.getCurrentInputValue().length,
      ) ?? "";
  }

  protected async getUserSuggestions(
    input: string,
  ): Promise<Array<string | number>> {
    return typeof this.settings.suggestions === "function"
      ? await this.settings.suggestions(input)
      : this.settings.suggestions ?? [];
  }

  #isFileModeEnabled(): boolean {
    return !!this.settings.files && this.#hasReadPermissions === true;
  }

  protected async getFileSuggestions(
    input: string,
  ): Promise<Array<string | number>> {
    if (!this.#isFileModeEnabled()) {
      return [];
    }

    const path = await Deno.stat(input)
      .then((file) => file.isDirectory ? input : dirname(input))
      .catch(() => dirname(input));

    return await listDir(path, this.settings.files);
  }

  protected async getSuggestions(): Promise<Array<string | number>> {
    const input = this.getCurrentInputValue();
    const suggestions = [
      ...this.loadSuggestions(),
      ...await this.getUserSuggestions(input),
      ...await this.getFileSuggestions(input),
    ].filter(uniqueSuggestions);

    if (!input.length) {
      return suggestions;
    }

    return suggestions
      .filter((value: string | number) =>
        stripColor(value.toString())
          .toLowerCase()
          .startsWith(input.toLowerCase())
      )
      .sort((a: string | number, b: string | number) =>
        distance((a || a).toString(), input) -
        distance((b || b).toString(), input)
      );
  }

  protected body(): string | Promise<string> {
    return this.getList() + this.getInfo();
  }

  protected getInfo(): string {
    if (!this.settings.info) {
      return "";
    }
    const selected: number = this.suggestionsIndex + 1;
    const matched: number = this.suggestions.length;
    const actions: Array<[string, Array<string>]> = [];

    if (this.suggestions.length) {
      if (this.settings.list) {
        actions.push(
          ["Next", getFiguresByKeys(this.settings.keys?.next ?? [])],
          ["Previous", getFiguresByKeys(this.settings.keys?.previous ?? [])],
          ["Next Page", getFiguresByKeys(this.settings.keys?.nextPage ?? [])],
          [
            "Previous Page",
            getFiguresByKeys(this.settings.keys?.previousPage ?? []),
          ],
        );
      } else {
        actions.push(
          ["Next", getFiguresByKeys(this.settings.keys?.next ?? [])],
          ["Previous", getFiguresByKeys(this.settings.keys?.previous ?? [])],
        );
      }
      actions.push(
        ["Complete", getFiguresByKeys(this.settings.keys?.complete ?? [])],
      );
    }
    actions.push(
      ["Submit", getFiguresByKeys(this.settings.keys?.submit ?? [])],
    );

    let info = this.settings.indent;
    if (this.suggestions.length) {
      info += brightBlue(Figures.INFO) + bold(` ${selected}/${matched} `);
    }
    info += actions
      .map((cur) => `${cur[0]}: ${bold(cur[1].join(" "))}`)
      .join(", ");

    return info;
  }

  protected getList(): string {
    if (!this.suggestions.length || !this.settings.list) {
      return "";
    }
    const suggestionToDescription = Object.fromEntries(zip(this.settings.suggestions||[],this.settings.suggestionDescriptions||[]))
    const list: Array<string> = [];
    const height: number = this.getListHeight();
    for (
      let i = this.suggestionsOffset;
      i < this.suggestionsOffset + height;
      i++
    ) {
      list.push(
        this.getListItem(
          `${this.suggestions[i]}`.replace(/❄️(.+)/, reset(cyan("❄️"))+dim(green("$1"))),
          this.suggestionsIndex === i,
          suggestionToDescription[this.suggestions[i]],
        ),
      );
    }
    if (list.length && this.settings.info) {
      list.push("");
    }
    return list.join("\n");
  }

  /**
   * Render option.
   * @param value        Option.
   * @param isSelected  Set to true if option is selected.
   */
  protected getListItem(
    value: string | number,
    isSelected?: boolean,
    description?: any,
  ): string {
    let line = this.settings.indent ?? "";
    line += isSelected ? `${this.settings.listPointer} ` : "  ";
    if (isSelected) {
      line += underline(this.highlight(value));
    } else {
      line += this.highlight(value);
    }
    if (description) {
        line += dim(`${description}`)
    }
    return line
  }

  /** Get suggestions row height. */
  protected getListHeight(
    suggestions: Array<string | number> = this.suggestions,
  ): number {
    return Math.min(
      suggestions.length,
      this.settings.maxRows || suggestions.length,
    );
  }

  /**
   * Handle user input event.
   * @param event Key event.
   */
  protected async handleEvent(event: KeyCode): Promise<void> {
    switch (true) {
      case this.isKey(this.settings.keys, "next", event):
        if (this.settings.list) {
          this.selectPreviousSuggestion();
        } else {
          this.selectNextSuggestion();
        }
        break;
      case this.isKey(this.settings.keys, "previous", event):
        if (this.settings.list) {
          this.selectNextSuggestion();
        } else {
          this.selectPreviousSuggestion();
        }
        break;
      case this.isKey(this.settings.keys, "nextPage", event):
        if (this.settings.list) {
          this.selectPreviousSuggestionsPage();
        } else {
          this.selectNextSuggestionsPage();
        }
        break;
      case this.isKey(this.settings.keys, "previousPage", event):
        if (this.settings.list) {
          this.selectNextSuggestionsPage();
        } else {
          this.selectPreviousSuggestionsPage();
        }
        break;
      case this.isKey(this.settings.keys, "complete", event):
        await this.#completeValue();
        break;
      case this.isKey(this.settings.keys, "moveCursorRight", event):
        if (this.inputIndex < this.inputValue.length) {
          this.moveCursorRight();
        } else {
          await this.#completeValue();
        }
        break;
      case this.isKey(this.settings.keys, "submit", event):
        if (this.settings.completeOnSubmit || ((this.getCurrentInputValue().trim().length == 0) && this.suggestionsIndex != -1) || selectedWithArrowKeys) {
            await this.#completeValue()
        }
        await this.submit();
        break;
      default:
        await super.handleEvent(event);
    }
    if (event.name == "up" || event.name == "down") {
        selectedWithArrowKeys = true
    } else {
        selectedWithArrowKeys = false
    }
  }

  /** Delete char right. */
  protected deleteCharRight(): void {
    if (this.inputIndex < this.inputValue.length) {
      super.deleteCharRight();
      if (!this.getCurrentInputValue().length) {
        this.suggestionsIndex = -1;
        this.suggestionsOffset = 0;
      }
    }
  }

  async #completeValue() {
    this.inputValue = await this.complete();
    this.inputIndex = this.inputValue.length;
    this.suggestionsIndex = 0;
    this.suggestionsOffset = 0;
  }

  protected async complete(): Promise<string> {
    let input: string = this.getCurrentInputValue();
    const suggestion: string | undefined = this
      .suggestions[this.suggestionsIndex]?.toString();

    if (this.settings.complete) {
      input = await this.settings.complete(input, suggestion);
    } else if (
      this.#isFileModeEnabled() &&
      input.at(-1) !== sep &&
      await isDirectory(input) &&
      (
        this.getCurrentInputValue().at(-1) !== "." ||
        this.getCurrentInputValue().endsWith("..")
      )
    ) {
      input += sep;
    } else if (suggestion) {
      input = suggestion;
    }

    return this.#isFileModeEnabled() ? normalize(input) : input;
  }

  /** Select previous suggestion. */
  protected selectPreviousSuggestion(): void {
    if (this.suggestions.length) {
      if (this.suggestionsIndex > -1) {
        this.suggestionsIndex--;
        if (this.suggestionsIndex < this.suggestionsOffset) {
          this.suggestionsOffset--;
        }
      }
    }
  }

  /** Select next suggestion. */
  protected selectNextSuggestion(): void {
    if (this.suggestions.length) {
      if (this.suggestionsIndex < this.suggestions.length - 1) {
        this.suggestionsIndex++;
        if (
          this.suggestionsIndex >=
            this.suggestionsOffset + this.getListHeight()
        ) {
          this.suggestionsOffset++;
        }
      }
    }
  }

  /** Select previous suggestions page. */
  protected selectPreviousSuggestionsPage(): void {
    if (this.suggestions.length) {
      const height: number = this.getListHeight();
      if (this.suggestionsOffset >= height) {
        this.suggestionsIndex -= height;
        this.suggestionsOffset -= height;
      } else if (this.suggestionsOffset > 0) {
        this.suggestionsIndex -= this.suggestionsOffset;
        this.suggestionsOffset = 0;
      }
    }
  }

  /** Select next suggestions page. */
  protected selectNextSuggestionsPage(): void {
    if (this.suggestions.length) {
      const height: number = this.getListHeight();
      if (this.suggestionsOffset + height + height < this.suggestions.length) {
        this.suggestionsIndex += height;
        this.suggestionsOffset += height;
      } else if (this.suggestionsOffset + height < this.suggestions.length) {
        const offset = this.suggestions.length - height;
        this.suggestionsIndex += offset - this.suggestionsOffset;
        this.suggestionsOffset = offset;
      }
    }
  }
}

function uniqueSuggestions(
  value: unknown,
  index: number,
  self: Array<unknown>,
) {
  return typeof value !== "undefined" && value !== "" &&
    self.indexOf(value) === index;
}

function isDirectory(path: string): Promise<boolean> {
  return Deno.stat(path)
    .then((file) => file.isDirectory)
    .catch(() => false);
}

async function listDir(
  path: string,
  mode?: boolean | RegExp,
): Promise<Array<string>> {
  const fileNames: string[] = [];

  for await (const file of Deno.readDir(path || ".")) {
    if (
      mode === true && (file.name.startsWith(".") || file.name.endsWith("~"))
    ) {
      continue;
    }
    const filePath = join(path, file.name);

    if (mode instanceof RegExp && !mode.test(filePath)) {
      continue;
    }
    fileNames.push(filePath);
  }

  return fileNames.sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });
}
