import {OnboardForm} from './OnboardForm'
export const RegisterLearn = (props: {}) => {
  return (
    <>
      <div id="learn">
        <button type="button">Learn 🎓</button>
      </div>

      <div id="form" >
        <OnboardForm mode="Learn"/>
      </div>

      <div id="deposit">
     {/*required if not yet a teacher*/}
      </div>
    </>
  )
}


