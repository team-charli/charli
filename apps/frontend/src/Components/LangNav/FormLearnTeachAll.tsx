import { useForm, Controller } from 'react-hook-form';
import UserListLearnTeachAll from "./UserListLearnTeachAll";

export type SelectionType = "Learn" | "Teach" | "All" | "";

interface ToggleButtonProps {
  label: SelectionType;
  name: string;
  control: any; //OPTIM:  For better typing, consider using the specific type from react-hook-form
  setValue: any; //OPTIM: For better typing, use SetValue<FormValues>
}

type FormValues = {
  option: SelectionType;
};

const ButtonLearnTeachAll = ({ label, name, control, setValue }: ToggleButtonProps) => {
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

const FormLearnTeachAll = () => {
  const { control, setValue, watch } = useForm<FormValues>({ defaultValues: { option: "" } });
  const option = watch("option");

  return (
    <>
      <form>
        <ButtonLearnTeachAll name="option" label="Learn" control={control} setValue={setValue} />
        <ButtonLearnTeachAll name="option" label="Teach" control={control} setValue={setValue} />
        <ButtonLearnTeachAll name="option" label="All" control={control} setValue={setValue} />
      </form>
      <UserListLearnTeachAll selection={option} />
    </>
  );
};

export default FormLearnTeachAll;
