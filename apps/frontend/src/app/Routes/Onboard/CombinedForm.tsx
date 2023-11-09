import { Formik, Field, Form, ErrorMessage, useField } from 'formik';
import { submitOnboardLearn } from "./API/onboardLearnAPI";
import { submitOnboardTeach  } from "./API/onboardTeachAPI";
import {useContextNullCheck} from '../../hooks/utils/useContextNullCheck'
import { StateContext } from '../../contexts/StateContext'
const {hasBalance, teachingLangs} = useContextNullCheck(StateContext)

type ToggleButtonProps = {
  label: string;
  name: string;
};

export type CombinedFormProps = {
  mode: "Learn" | "Teach";
  languages?: string[];  // Optional languages prop for future use
}

type FormValues = {
  name: string;
  [key: string]: string | boolean;  // Allow additional keys for languages
};

const ToggleButton = ({ label, ...props }: ToggleButtonProps) => {
  const [field] = useField(props);
  return (
    <button
      type="button"
      className={field.value ? 'active' : ''}
      onClick={() => field.onChange({ target: { name: field.name, value: !field.value } })}
      {...props}
    >
      {label}
    </button>
  );
};

export const CombinedForm = ({ mode, languages = ['English', 'Spanish', 'Chinese', 'Thai'] }: CombinedFormProps) => {
  const initialValues = Object.fromEntries(languages.map(lang => [lang, false])) as FormValues;
  initialValues.name = '';

  return (
    <Formik<FormValues>
      initialValues={initialValues}
      onSubmit={(values) => {
        const selectedLanguages = languages.filter(language => values[language]);

        if (mode === "Learn") {
          submitOnboardLearn({ langs: selectedLanguages, name: values.name, hasBalance, teachingLangs})
        } else {
          submitOnboardTeach({ langs: selectedLanguages, name: values.name })
        }
      }}
    >
      <Form>
        {languages.map(language => (
          <ToggleButton key={language} label={language} name={language} />
        ))}

        <label htmlFor="name">Name</label>
        <Field name="name" type="text" />
        <ErrorMessage name="name" />

        <button type="submit">Submit</button>
      </Form>
    </Formik>
  );
};

export default CombinedForm;
