import { HuddleClient } from "@huddle01/web-core";

export const huddleClient = new HuddleClient({
  projectId: import.meta.env.VITE_HUDDLE_PROJECT_ID,
  options: {
    // `activeSpeakers` will be most active `n` number of peers, by default it's 8
    activeSpeakers: {
      size: 2,
    },
  },
});

