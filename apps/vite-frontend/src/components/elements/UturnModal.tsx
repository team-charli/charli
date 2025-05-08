import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import Login from '@/pages/login'

const UturnModal = () => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Dialog 
      as="div" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8" 
      open={isOpen} 
      onClose={() => setIsOpen(true)}
    >
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      
      <Dialog.Panel className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg
        transform overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl 
        bg-white 
        p-4 sm:p-5 md:p-6 lg:p-8 
        text-left align-middle shadow-xl 
        transition-all 
        z-10
        relative">
        <Dialog.Title
          as="h3"
          className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3 md:mb-4">
          Sign In / Register
        </Dialog.Title>
        <Dialog.Description className="text-sm sm:text-base md:text-lg text-gray-600 mb-4 sm:mb-5 md:mb-6"> 
          The moment you click your sign-in method and sign in to your account, you'll receive a crypto account attached to it.
        </Dialog.Description>
        
        <div className="mt-3 sm:mt-4 md:mt-6">
          <Login />
        </div>
        
        <button 
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-500 focus:outline-none"
          onClick={() => setIsOpen(false)}
        >
          <span className="sr-only">Close</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </Dialog.Panel>
    </Dialog>
  )
}

export default UturnModal


