import {CombinedForm} from './CombinedForm'

export const RegisterLearn = (props: {}) => {
  return (
    <>
      <div id="learn">
        <h1>Charli</h1>
        <button type="button">Learn 🎓</button>
      </div>

      <div id="form" >
        <CombinedForm mode="Learn"/>
      </div>

      <div id="deposit">
     {/*required if not yet a teacher*/}
      </div>
    </>
  )
}


