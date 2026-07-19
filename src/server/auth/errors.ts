export class InvalidCredentialsError extends Error {
  code: string;

  constructor(message?: string) {
    super(message);
    this.name = "InvalidCredentialsError";
    this.code = "invalid_credentials";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = "Unauthenticated") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}
