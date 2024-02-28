import {  Dispatch } from 'react';
import { Listbox } from '@headlessui/react';

const userGroups: { name: "Learn" | "Teach" | "Schedule" }[] = [
  { name: 'Learn' },
  { name: 'Teach' },
  { name: 'Schedule' },
];
interface DropDownButtonProps {
  modeView: "Learn" | "Teach" | "Schedule";
  setModeView: Dispatch<React.SetStateAction<"Learn" | "Teach" | "Schedule">>
}

const DropDownButton = ({ modeView: modeView, setModeView: setModeView }: DropDownButtonProps) => {
  const selectedUserGroup = userGroups.find(group => group.name === modeView);
  const groupEmojis = {
    Learn: '🎓',
    Teach: '🤑',
    Schedule: '🏫',
  };

  return (
    <div className="__dropdown-button-container__ flex justify-center m-10">
      <div className="w-56">
        <Listbox value={selectedUserGroup} onChange={(value) => setModeView(value.name)}>
          {({ open }) => (
            <>
              <div className="mt-1 relative">
                <Listbox.Button className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <span className="block truncate">{modeView}</span>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {userGroups.map((group, groupIdx) => (
                    <Listbox.Option
                      key={groupIdx}
                      className={({ active }) =>
                        `cursor-default select-none relative py-2 pl-10 pr-4 ${
active ? 'text-white bg-indigo-600' : 'text-gray-900'
}`
                      }
                      value={group}
                    >
                      {({ selected, active }) => (
                        <>
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {`${group.name} ${groupEmojis[group.name]}`}
                          </span>
                          {selected ? (
                            <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
active ? 'text-white' : 'text-indigo-600'
}`}>
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </>
          )}
        </Listbox>
      </div>
    </div>
  );
};

export default DropDownButton;


