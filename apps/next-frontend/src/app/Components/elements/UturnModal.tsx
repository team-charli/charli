import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import LoginView from '@/pages/login/Components/LoginView'

const UturnModal = () => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Dialog as="div" className="fixed inset-0 z-10 flex items-center justify-center" open={isOpen} onClose={() => setIsOpen(true)}>
      <Dialog.Panel className="w-full max-w-md mx-auto transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
        <Dialog.Title
          as="h3"
          className="text-lg font-medium leading-6 text-gray-900">
          Sign In / Register
        </Dialog.Title>
          <Dialog.Description> The moment you click your sign-in method and sign in to your account, you'll recieve a crypto account attached to it.
          </Dialog.Description>
        <LoginView parentIsRoute={false}/>
      </Dialog.Panel>
    </Dialog>
  )
}

export default UturnModal


