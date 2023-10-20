import {useEffect} from 'react'
import {SelectionType} from './FormLearnTeachAll'

interface UserListLearnTeachAllProps {
  selection: SelectionType;
}

const UserListLearnTeachAll = ({selection}: UserListLearnTeachAllProps ) => {

useEffect(() => {
  //get users based on selection
  //cache them
  // render them
  console.log(selection)
})

  return (
    <div>LearnTeachAll</div>
  )
}

export default UserListLearnTeachAll
