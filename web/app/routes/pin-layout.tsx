import React from 'react'
import type { Route } from '../+types/';
import AuthSimpleLayout from '~/components/layout/auth/auth-simple-layout'
import { Outlet } from 'react-router';
import  { PinRoute } from '~/components/layout/protected-routes';
import Footer from '~/routes/footer';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CrabFarm" },
    { name: "description", content: "IoT and Machine learning based aquaculture" },
  ]
}


const AuthLayout = () => {
  return (
    <PinRoute>
      <AuthSimpleLayout title='CrabFarm' description='IoT and Machine learning based aquaculture'>
        <Outlet />
      </AuthSimpleLayout>
      <Footer />
    </PinRoute>
  )
}

export default AuthLayout