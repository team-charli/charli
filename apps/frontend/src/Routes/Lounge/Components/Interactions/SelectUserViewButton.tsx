import { useForm, Controller } from 'react-hook-form';

import UserList from "./UserListLearnTeachAll";

export type SelectionType = "Learn" | "Teach" | "All" | "";

interface ToggleButtonProps {
  label: SelectionType;
  name: string;
  control: any;
  setValue: any;
}

type FormValues = {
  option: SelectionType;
};

const Button = ({ label, name, control, setValue }: ToggleButtonProps) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <button
          type="button"
          onClick={() => setValue(name, label)}
        >
          {label}
        </button>
      )}
    />
  );
};

const DropDownButton = () => {
  const { control, setValue, watch } = useForm<FormValues>({ defaultValues: { option: "" } });
  const option = watch("option");

  return (
    <>
      <form>
        <Button name="option" label="Learn" control={control} setValue={setValue} />
        <Button name="option" label="Teach" control={control} setValue={setValue} />
        <Button name="option" label="All" control={control} setValue={setValue} />
      </form>
      <UserList selection={option} />
    </>
  );
};

export default DropDownButton;
