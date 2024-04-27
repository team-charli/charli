import IconHeader from '@/components/IconHeader';
import NonButtonLink from '@/components/elements/NonButtonLink';
import BannerHeader from '@/components/headers/BannerHeader';
import { OnboardContext } from '@/contexts/OnboardContext';
import { useContext } from 'react';
import OnboardForm from './Components/OnboardForm';

export const Onboard = () => {
  const { onboardMode } = useContext(OnboardContext);

  if (!onboardMode) {
    return (
      <>
        <IconHeader />
        <BannerHeader />
        <NonButtonLink /> {/* This will render an empty NonButtonLink */}
      </>
    );
  }

  const buttonText = onboardMode === 'Learn' ? 'Learn 🎓' : 'Teach 🤑';

  return (
    <>
      <IconHeader />
      <BannerHeader />
      <div className="__non-button-container__ flex justify-center m-10">
        <NonButtonLink>{buttonText}</NonButtonLink>
      </div>
      <OnboardForm onboardMode={onboardMode} />
    </>
  );
};

export default Onboard;

