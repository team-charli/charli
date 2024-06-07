import React from 'react';
import NativeLanguage from '../elements/IconHeaderElements/NativeLanguage';
import { DefaultNativeLanguageQuery } from '@/app/SupabaseQueries/DefaultNativeLanguageQuery';

const NativeLanguageWithData = async () => {
  const defaultNativeLanguage = await DefaultNativeLanguageQuery();

  return (
    <NativeLanguage nativeLanguage={defaultNativeLanguage} />
  );
};

export default NativeLanguageWithData;
