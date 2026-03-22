import { Client, Account, Databases } from 'appwrite'

export function createBrowserClient(): Client {
  return new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
}

export function createBrowserAccount(client: Client): Account {
  return new Account(client)
}

export function createBrowserDatabases(client: Client): Databases {
  return new Databases(client)
}
