'use client'
import dynamic from 'next/dynamic'

const TestPageInner = dynamic(() => import('../../dashboard/components/test-page'), { ssr: false })
export default function ClientTest(){
  return <TestPageInner />
}
