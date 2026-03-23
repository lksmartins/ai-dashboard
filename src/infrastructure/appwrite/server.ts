import { Client, Account, Databases } from 'node-appwrite'
import { cookies } from 'next/headers'

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

  const cookieStore = await cookies()
  const jwtCookie = cookieStore.get('appwrite_jwt')

  if (jwtCookie) {
    client.setJWT(jwtCookie.value)
  }

  return {
    account: new Account(client),
    databases: new Databases(client),
  }
}

export function createAdminClient() {
  if (!process.env.APPWRITE_API_KEY) {
    throw new Error('APPWRITE_API_KEY is not set')
  }

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY)

  return {
    account: new Account(client),
    databases: new Databases(client),
  }
}
