declare module 'emmet' {
  interface ExpandOptions {
    syntax?: string;
    options?: {
      'output.indent'?: string;
      'output.baseIndent'?: string;
      'output.newline'?: string;
      'output.format'?: boolean;
    };
  }

  function expand(abbreviation: string, options?: ExpandOptions): string;
  export = expand;
}
