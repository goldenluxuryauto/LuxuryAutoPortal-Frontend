declare module 'react-google-recaptcha' {
  import * as React from 'react';

  export interface ReCAPTCHAProps {
    sitekey?: string;
    size?: 'compact' | 'normal' | 'invisible';
    theme?: 'light' | 'dark';
    tabindex?: number;
    onChange?: (value: string | null) => void;
    asyncScriptOnLoad?: () => void;
    hl?: string;
    badge?: 'bottomright' | 'bottomleft' | 'inline';
    'data-testid'?: string;
  }

  export default class ReCAPTCHA extends React.Component<ReCAPTCHAProps> {
    getValue(): string | null;
    reset(): void;
    executeAsync?(): Promise<string>;
  }
}
