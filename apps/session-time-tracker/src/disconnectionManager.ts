export class DisconnectionManager {
  constructor(public state: DurableObjectState, public env: Env) {}

  async fetch(request: Request) {
    if (request.method === 'POST') {
      const { participantRole, disconnectTime } = await request.json() as any;

      await this.state.storage.put(`${participantRole}DisconnectTime`, disconnectTime);

      const disconnectCount = await this.state.storage.get(`${participantRole}DisconnectCount`) as number || 0;
      await this.state.storage.put(`${participantRole}DisconnectCount`, disconnectCount + 1);

      await this.state.storage.setAlarm(disconnectTime + 2 * 60 * 1000); // Set alarm for 2 minutes
    }
  }

  async alarm() {
    const participantRoles = ['teacher', 'learner'];

    for (const participantRole of participantRoles) {
      const disconnectTime = await this.state.storage.get(`${participantRole}DisconnectTime`);

      if (disconnectTime && Date.now() - (disconnectTime as number) >= 2 * 60 * 1000) {
        const timerObjectId = this.env.TIMER_OBJECT.idFromString(this.state.id.toString());
        const timerObjectStub = this.env.TIMER_OBJECT.get(timerObjectId);

        await timerObjectStub.fetch('http://timer-object/broadcast', {
          method: 'POST',
          body: JSON.stringify({
            type: 'connectionTimeout',
            message: `User ${participantRole} dropped connection exceeds 2-minute timeout.`,
            data: { participantRole },
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        await this.state.storage.delete(`${participantRole}DisconnectTime`);
        await this.state.storage.delete(`${participantRole}DisconnectCount`);
      }
    }
  }

}

interface Env {
  TIMER_OBJECT: DurableObjectNamespace;
}
