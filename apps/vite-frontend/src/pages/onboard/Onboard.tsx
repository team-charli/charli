import IconHeader from '@/components/IconHeader';
import NonButtonLink from '@/components/elements/NonButtonLink';
import BannerHeader from '@/components/headers/BannerHeader';
import OnboardForm from './Components/OnboardForm';
import { useAtomValue } from 'jotai';
import { onboardModeAtom } from '@/atoms/atoms';

export const Onboard = () => {

  const onboardMode = useAtomValue(onboardModeAtom);

  const buttonText = onboardMode === 'Learn' ? 'Learn 🎓' : 'Teach 🤑';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto">
          <IconHeader />
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12">
        <div className="max-w-xl mx-auto mb-6 sm:mb-8 md:mb-10">
          <BannerHeader />
        </div>
        
        <div className="max-w-lg mx-auto text-center mb-6 sm:mb-8 md:mb-10">
          <div className="inline-block bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">
              {onboardMode === 'Learn' ? 'Setup Your Learning Profile' : 'Setup Your Teaching Profile'}
            </h1>
            <div className="flex justify-center mb-3">
              <div className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm sm:text-base font-medium">
                {buttonText}
              </div>
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              {onboardMode === 'Learn' 
                ? 'Complete your profile to start finding language teachers.' 
                : 'Complete your profile to start teaching language learners.'}
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <OnboardForm onboardMode={onboardMode} />
        </div>
      </div>
    </div>
  );
};

export default Onboard;

