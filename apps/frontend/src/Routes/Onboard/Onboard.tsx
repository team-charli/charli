import { useContext } from 'react';
import IconHeader from '../../Components/Headers/IconHeader';
import BannerHeader from '../../Components/Headers/BannerHeader';
import { OnboardContext } from '../../contexts/OnboardContext';
import OnboardForm from './OnboardForm';
import NonButtonLink from '../../Components/Elements/NonButtonLink';

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
