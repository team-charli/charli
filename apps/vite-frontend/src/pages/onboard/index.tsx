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

