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
    <div 
      onClick={() => void ringBell()} 
      className="w-full bg-blue-50 border-y border-blue-200 py-2 sm:py-3 px-4 sm:px-6 
                flex items-center justify-center gap-2 
                cursor-pointer hover:bg-blue-100 transition-colors duration-200
                sticky top-0 z-20 shadow-sm"
    >
      <span className="text-lg sm:text-xl md:text-2xl">🔔</span>
      <span className="text-sm sm:text-base md:text-lg font-medium text-blue-800">
        Ring Bell
      </span>
      <span className="text-xs sm:text-sm text-blue-600 hidden sm:inline-block">
        (Alerts all participants)
      </span>
    </div>
  )
}
