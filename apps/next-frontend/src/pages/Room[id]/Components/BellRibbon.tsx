import { useDataMessage } from '@huddle01/react/hooks';
type BellRibbonProps = {}

export default function BellRibbon({}: BellRibbonProps) {
  const { sendData } = useDataMessage();
  const playBellSound = () => {
    // Logic to play bell sound locally
    // For example, using an audio file and the Audio API
    const audio = new Audio('/path/to/bell-sound.mp3');
    audio.play();
  };

 const ringBell = () => {
    playBellSound(); // Play bell sound locally

    sendData({
      to: '*',
      payload: JSON.stringify({ action: 'ringBell' }),
      label: 'bell',
    });
  };
  return (
    <>
    {/* css draw border around div; make 3em x screenwidth*/}
    <div onClick={ringBell} className="__Bell-Ribbon__">🔔</div>
    </>
  )
}
