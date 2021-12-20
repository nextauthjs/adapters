import type { ModelExtension } from "../types"
import type { AdapterUser } from "next-auth/adapters"
import {
  extendInsertValuesQuery,
  extendSelectQuery,
  generateSetQuery,
} from "./utils"

describe("extendSelectQuery", () => {
  test("Empty result if no extension is given", () => {
    const ext: ModelExtension = {}
    const sqlParts = extendSelectQuery(ext)

    expect(sqlParts).toEqual([])
  })
  test("Extension equal mapping", () => {
    const ext: ModelExtension = { phoneNumber: "phoneNumber" }
    const sqlParts = extendSelectQuery(ext)

    expect(sqlParts).toEqual(["phoneNumber AS phoneNumber"])
  })
  test("Extension unequal mapping", () => {
    const ext: ModelExtension = { phoneNumber: "phone_number" }
    const sqlParts = extendSelectQuery(ext)

    expect(sqlParts).toEqual(["phone_number AS phoneNumber"])
  })
  test("Extension config object", () => {
    const ext: ModelExtension = { phoneNumber: { dbField: "phone_number" } }
    const sqlParts = extendSelectQuery(ext)

    expect(sqlParts).toEqual(["phone_number AS phoneNumber"])
  })
  test("Extension multiple entries", () => {
    const ext: ModelExtension = {
      phoneNumber: { dbField: "phone_number" },
      avatarUrl: "avatar_url",
    }
    const sqlParts = extendSelectQuery(ext)

    expect(sqlParts).toEqual([
      "phone_number AS phoneNumber",
      "avatar_url AS avatarUrl",
    ])
  })
})

describe("generateSetQuery", () => {
  const exampleData: AdapterUser = {
    id: "123",
    name: "Joe Doe",
    emailVerified: new Date(),
  }

  test("Default parameters", () => {
    const ext: ModelExtension = {}
    const sqlParts = generateSetQuery(exampleData, ext)

    expect(sqlParts).toEqual([
      "id = :id",
      "name = :name",
      "email_verified = :emailVerified",
    ])
  })
  test("Changed default mapping", () => {
    const ext: ModelExtension = {}
    const sqlParts = generateSetQuery(exampleData, ext, { name: "user_name" })

    expect(sqlParts).toEqual([
      "id = :id",
      "user_name = :name",
      "emailVerified = :emailVerified",
    ])
  })
  test("Extension equal mapping", () => {
    const ext: ModelExtension = { phoneNumber: "phoneNumber" }
    const extendedExampleData = { ...exampleData, phoneNumber: "+1234566789" }
    const sqlParts = generateSetQuery(extendedExampleData, ext)

    expect(sqlParts).toEqual([
      "id = :id",
      "name = :name",
      "email_verified = :emailVerified",
      "phoneNumber = :phoneNumber",
    ])
  })
  test("Extension unequal mapping", () => {
    const ext: ModelExtension = { phoneNumber: "phone_number" }
    const extendedExampleData = { ...exampleData, phoneNumber: "+1234566789" }
    const sqlParts = generateSetQuery(extendedExampleData, ext)

    expect(sqlParts).toEqual([
      "id = :id",
      "name = :name",
      "email_verified = :emailVerified",
      "phone_number = :phoneNumber",
    ])
  })
  test("Extension config object", () => {
    const ext: ModelExtension = { phoneNumber: { dbField: "phone_number" } }
    const extendedExampleData = { ...exampleData, phoneNumber: "+1234566789" }
    const sqlParts = generateSetQuery(extendedExampleData, ext)

    expect(sqlParts).toEqual([
      "id = :id",
      "name = :name",
      "email_verified = :emailVerified",
      "phone_number = :phoneNumber",
    ])
  })
  test("Extension multiple entries", () => {
    const ext: ModelExtension = {
      phoneNumber: { dbField: "phone_number" },
      avatarUrl: "avatar_url",
    }
    const extendedExampleData = {
      ...exampleData,
      phoneNumber: "+1234566789",
      avatarUrl: "https://example.org/avatar.png",
    }
    const sqlParts = generateSetQuery(extendedExampleData, ext)

    expect(sqlParts).toEqual([
      "id = :id",
      "name = :name",
      "email_verified = :emailVerified",
      "phone_number = :phoneNumber",
      "avatar_url = :avatarUrl",
    ])
  })
  test("Does not contain statements for not existing data keys", () => {
    const ext: ModelExtension = {
      phoneNumber: { dbField: "phone_number" },
      avatarUrl: "avatar_url",
    }
    const reducedExampleData = {
      name: "Mr Anderson",
      phoneNumber: "+987654321",
    }
    const sqlParts = generateSetQuery(reducedExampleData, ext)

    expect(sqlParts).toEqual(["name = :name", "phone_number = :phoneNumber"])
  })
})

describe("extendInsertValuesQuery", () => {
  const exampleData: AdapterUser = {
    id: "123",
    name: "Joe Doe",
    emailVerified: new Date(),
  }

  test("Empty result if no extension is given", () => {
    const ext: ModelExtension = {}
    const { insert, values } = extendInsertValuesQuery(exampleData, ext)

    expect(insert).toEqual([])
    expect(values).toEqual([])
  })
  test("Extension equal mapping", () => {
    const ext: ModelExtension = { phoneNumber: "phoneNumber" }
    const extendedExampleData = { ...exampleData, phoneNumber: "+1234566789" }
    const { insert, values } = extendInsertValuesQuery(extendedExampleData, ext)

    expect(insert).toEqual(["phoneNumber"])
    expect(values).toEqual([":phoneNumber"])
  })
  test("Extension unequal mapping", () => {
    const ext: ModelExtension = { phoneNumber: "phone_number" }
    const extendedExampleData = { ...exampleData, phoneNumber: "+1234566789" }
    const { insert, values } = extendInsertValuesQuery(extendedExampleData, ext)

    expect(insert).toEqual(["phone_number"])
    expect(values).toEqual([":phoneNumber"])
  })
  test("Extension config object", () => {
    const ext: ModelExtension = { phoneNumber: { dbField: "phone_number" } }
    const extendedExampleData = { ...exampleData, phoneNumber: "+1234566789" }
    const { insert, values } = extendInsertValuesQuery(extendedExampleData, ext)

    expect(insert).toEqual(["phone_number"])
    expect(values).toEqual([":phoneNumber"])
  })
  test("Extension multiple entries", () => {
    const ext: ModelExtension = {
      phoneNumber: { dbField: "phone_number" },
      avatarUrl: "avatar_url",
    }
    const extendedExampleData = {
      ...exampleData,
      phoneNumber: "+1234566789",
      avatarUrl: "https://example.org/avatar.png",
    }
    const { insert, values } = extendInsertValuesQuery(extendedExampleData, ext)

    expect(insert).toEqual(["phone_number", "avatar_url"])
    expect(values).toEqual([":phoneNumber", ":avatarUrl"])
  })
  test("Does not contain statements for not existing data keys", () => {
    const ext: ModelExtension = {
      phoneNumber: { dbField: "phone_number" },
      avatarUrl: "avatar_url",
    }
    const reducedExampleData = {
      phoneNumber: "+987654321",
    }
    const { insert, values } = extendInsertValuesQuery(reducedExampleData, ext)

    expect(insert).toEqual(["phone_number"])
    expect(values).toEqual([":phoneNumber"])
  })
  test("Does only contain extended data model statements", () => {
    const ext: ModelExtension = {
      phoneNumber: { dbField: "phone_number" },
      avatarUrl: "avatar_url",
    }
    const reducedExampleData = {
      name: "Mr Anderson",
      phoneNumber: "+987654321",
      avatarUrl: "https://example.org/avatar2.png",
    }
    const { insert, values } = extendInsertValuesQuery(reducedExampleData, ext)

    expect(insert).toEqual(["phone_number", "avatar_url"])
    expect(values).toEqual([":phoneNumber", ":avatarUrl"])
  })
})
