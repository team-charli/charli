import { StateContext } from '../contexts/StateContext'
import { useContextNullCheck } from  '../hooks/utils/useContextNullCheck'
import IconHeader from '../Components/Headers/IconHeader'
import BannerHeader from '../Components/Headers/BannerHeader'
import ButtonLink from '../Components/Elements/ButtonLink'

const Entry = () => {
  const {onBoard: {hasOnboarded} } = useContextNullCheck(StateContext)

  return (
    <>
    <IconHeader />
    <BannerHeader />
      <div className=" _button-container_ flex justify-center gap-x-8 mt-64">
      <ButtonLink path="/lounge">Learn 🎓 </ButtonLink>
      <ButtonLink path="/lounge">Teach 🤑</ButtonLink>
      </div>
    </>
  );
}

export default Entry
