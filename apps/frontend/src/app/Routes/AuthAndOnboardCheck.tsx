import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import Login from '../Login';
import Onboard from './Onboard/Onboard';
import Lounge from "./Lounge/Lounge";

const AuthAndOnboardCheck = () => {
  const [status, setStatus] = useState({ isLoggedIn: false, hasOnboarded: false });

  useEffect(() => {
    // Assume fetchStatus is a function that fetches the login and onboarding status
    fetchStatus().then(setStatus);
  }, []);

  if (!status.isLoggedIn) {
    return <Redirect to="/login" />;
  }

  if (!status.hasOnboarded) {
    return <Redirect to="/onboard" />;
  }

  return <Lounge />;
};

export default AuthAndOnboardCheck;

