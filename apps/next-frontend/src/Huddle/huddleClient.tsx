import { HuddleClient, HuddleProvider } from "@huddle01/react"

const projectId =  process.env.NEXT_PUBLIC_HUDDLE_PROJECT_ID as string;;


export const huddleClient = new HuddleClient({
  projectId,
  options: {
    // `activeSpeakers` will be most active `n` number of peers, by default it's 8
    activeSpeakers: {
      size: 2,
    },
  },
});


