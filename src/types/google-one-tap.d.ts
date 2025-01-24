declare namespace google.accounts.id {
    interface CredentialResponse {
      credential: string;
      select_by: string;
    }
  
    interface GsiButtonConfiguration {
      type: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: string;
      local?: string;
    }
  
    function initialize(idConfiguration: {
      client_id: string;
      callback: (response: CredentialResponse) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
      context?: string;
      nonce?: string;
      use_fedcm_for_prompt?: boolean;
    }): void;
  
    function prompt(): void;
    function renderButton(
      parent: HTMLElement,
      options: GsiButtonConfiguration
    ): void;
  }