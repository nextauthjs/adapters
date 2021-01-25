import * as Prisma from "@prisma/client";
import { Session, User, VerificationRequest } from "@prisma/client";
import { Adapter, Profile } from "next-auth/adapters";
declare type IsValid<T extends Prisma.PrismaClient, U extends keyof T> = Required extends keyof T[U] ? Required extends keyof T[U] ? T[U][Required] extends (args?: any) => any ? 1 : 0 : 0 : 0;
declare type Required = "create" | "findUnique" | "delete" | "update";
declare type Filter<T extends Prisma.PrismaClient> = {
    [K in keyof T]-?: {
        1: K;
        0: never;
    }[IsValid<T, K>];
}[keyof T];
export default function PrismaAdapter<T extends Prisma.PrismaClient, U extends Filter<T>, A extends Filter<T>, S extends Filter<T>, VR extends Filter<T>>(config: {
    prisma: T;
    modelMapping: {
        User: U;
        Account: A;
        Session: S;
        VerificationRequest: VR;
    };
}): Adapter<User, Profile, Session, VerificationRequest>;
export {};
