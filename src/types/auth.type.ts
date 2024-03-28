export type AuthUser = {
  id: number
  name: string
  email: string
}

export type AuthToken = {
  type: string
  token: string
}

export type AuthLoginForm = {
  email: string
  password: string
}

export type LocalStorage = {
  token: AuthToken
  user: AuthUser
}
