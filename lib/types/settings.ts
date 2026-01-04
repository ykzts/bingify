export interface SystemFeatures {
  gatekeeper: {
    email: {
      enabled: boolean;
    };
    twitch: {
      enabled: boolean;
      follower: {
        enabled: boolean;
      };
      subscriber: {
        enabled: boolean;
      };
    };
    youtube: {
      enabled: boolean;
      member: {
        enabled: boolean;
      };
      subscriber: {
        enabled: boolean;
      };
    };
  };
  // Other feature flags can be added here
}
