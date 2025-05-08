import React from 'react'
import { Outlet } from '@tanstack/react-router'
import BannerHeader from '@/components/headers/BannerHeader'

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col w-full text-sm sm:text-base md:text-base lg:text-lg">
      <header className="container mx-auto px-3 sm:px-5 md:px-8 lg:px-10 py-3 sm:py-4 md:py-6 lg:py-8">
        <BannerHeader />
      </header>
      <main className="flex-grow container mx-auto px-3 sm:px-5 md:px-8 lg:px-10 pt-2 sm:pt-3 md:pt-4 lg:pt-6 pb-6 sm:pb-8 md:pb-10 lg:pb-12">
        <div className="max-w-full sm:max-w-[95%] md:max-w-[90%] lg:max-w-[85%] mx-auto">
          <Outlet />
        </div>
      </main>
      <footer className="py-3 sm:py-4 md:py-5 lg:py-6 border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-3 sm:px-5 md:px-8 lg:px-10 text-xs sm:text-sm md:text-base text-center text-gray-500">
          © {new Date().getFullYear()} Charli
        </div>
      </footer>
    </div>
  )
}

export default Layout