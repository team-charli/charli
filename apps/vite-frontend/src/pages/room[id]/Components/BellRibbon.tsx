import { useDataMessage } from '@huddle01/react/hooks';

export default function BellRibbon() {
  const { sendData } = useDataMessage();
  const playBellSound = async () => {
    const audio = new Audio('/path/to/bell-sound.mp3');
    await audio.play();
  };

 const ringBell = async () => {
    await playBellSound(); // Play bell sound locally

    await sendData({
      to: '*',
      payload: JSON.stringify({ action: 'ringBell' }),
      label: 'bell',
    });
  };
  return (
    <>
    {/* css draw border around div; make 3em x screenwidth*/}
    <div onClick={() => void ringBell()} className="__Bell-Ribbon__">🔔</div>
    </>
  )
}
