import { AccessToken, Role } from 'https://esm.sh/@huddle01/server-sdk/auth';

const huddleApiKey = Deno.env.get('HUDDLE_API_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === "POST") {
    try {
      const roomId = await req.text()
      const accessToken = new AccessToken({
        apiKey: huddleApiKey ,
        roomId: roomId,
        //available roles: Role.HOST, Role.CO_HOST, Role.SPEAKER, Role.LISTENER, Role.GUEST - depending on the privileges you want to give to the user
        role: Role.GUEST,
        //custom permissions give you more flexibility in terms of the user privileges than a pre-defined role
        // permissions: {
        //   admin: true,
        //   canConsume: true,
        //   canProduce: true,
        //   canProduceSources: {
        //     cam: true,
        //     mic: true,
        //     screen: true,
        //   },
        //   canRecvData: true,
        //   canSendData: true,
        //   canUpdateMetadata: true,
        // },
        options: {
          metadata: {
            // you can add any custom attributes here which you want to associate with the user
            // walletAddress: "mizanxali.eth"
          },
        },
      });
      const data = {status: "Success", accessToken: accessToken.toJwt(), roomId};
      return new Response(JSON.stringify(data), {status: 200, headers: {"Content-Type": "application/json"}})
    }
    catch (error) {
      return new Response('Error processing request', { status: 500 });
    }
  }
})


