"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var klona_1 = require("klona");
var lru_cache_1 = __importDefault(require("lru-cache"));
// !TODO Expose `errors` and `logger` in next-auth
// @ts-ignore
var errors_1 = require("next-auth/dist/lib/errors");
// @ts-ignore
var logger_1 = __importDefault(require("next-auth/dist/lib/logger"));
var sessionCache = new lru_cache_1.default({
    maxAge: 24 * 60 * 60 * 1000,
    max: 1000,
});
var userCache = new lru_cache_1.default({
    maxAge: 24 * 60 * 60 * 1000,
    max: 1000,
});
var maxAge = function (expires) {
    return expires ? new Date(expires).getTime() - Date.now() : undefined;
};
function PrismaAdapter(config) {
    var prisma = config.prisma, modelMapping = config.modelMapping;
    var User = modelMapping.User, Account = modelMapping.Account, Session = modelMapping.Session, VerificationRequest = modelMapping.VerificationRequest;
    function getAdapter(appOptions) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            function debug(debugCode) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                logger_1.default.debug.apply(logger_1.default, __spreadArrays(["PRISMA_" + debugCode], args));
            }
            function createUser(profile) {
                return __awaiter(this, void 0, void 0, function () {
                    var user, error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                debug("CREATE_USER", profile);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, prisma[User].create({
                                        data: {
                                            name: profile.name,
                                            email: profile.email,
                                            image: profile.image,
                                            emailVerified: profile.emailVerified
                                                ? profile.emailVerified.toISOString()
                                                : null,
                                        },
                                    })];
                            case 2:
                                user = _a.sent();
                                userCache.set(user.id, user);
                                return [2 /*return*/, user];
                            case 3:
                                error_1 = _a.sent();
                                logger_1.default.error("CREATE_USER_ERROR", error_1);
                                return [2 /*return*/, Promise.reject(new errors_1.CreateUserError(error_1))];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            }
            function getUser(id) {
                return __awaiter(this, void 0, void 0, function () {
                    var cachedUser;
                    var _this = this;
                    return __generator(this, function (_a) {
                        debug("GET_USER", id);
                        try {
                            cachedUser = userCache.get(id);
                            if (cachedUser) {
                                debug("GET_USER - Fetched from LRU Cache", cachedUser);
                                // stale while revalidate
                                (function () { return __awaiter(_this, void 0, void 0, function () {
                                    var user;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, prisma[User].findUnique({
                                                    where: { id: id },
                                                    rejectOnNotFound: true,
                                                })];
                                            case 1:
                                                user = (_a.sent());
                                                userCache.set(user.id, user);
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })();
                                return [2 /*return*/, cachedUser];
                            }
                            return [2 /*return*/, prisma[User].findUnique({ where: { id: id } })];
                        }
                        catch (error) {
                            logger_1.default.error("GET_USER_BY_ID_ERROR", error);
                            // @ts-ignore
                            return [2 /*return*/, Promise.reject(new Error("GET_USER_BY_ID_ERROR", error))];
                        }
                        return [2 /*return*/];
                    });
                });
            }
            function getUserByEmail(email) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        debug("GET_USER_BY_EMAIL", email);
                        try {
                            if (!email) {
                                return [2 /*return*/, Promise.resolve(null)];
                            }
                            return [2 /*return*/, prisma[User].findUnique({
                                    where: { email: email },
                                    rejectOnNotFound: true,
                                })];
                        }
                        catch (error) {
                            logger_1.default.error("GET_USER_BY_EMAIL_ERROR", error);
                            // @ts-ignore
                            return [2 /*return*/, Promise.reject(new Error("GET_USER_BY_EMAIL_ERROR", error))];
                        }
                        return [2 /*return*/];
                    });
                });
            }
            function getUserByProviderAccountId(providerId, providerAccountId) {
                return __awaiter(this, void 0, void 0, function () {
                    var account, error_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                debug("GET_USER_BY_PROVIDER_ACCOUNT_ID", providerId, providerAccountId);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                if (!providerId || !providerAccountId)
                                    return [2 /*return*/, null];
                                return [4 /*yield*/, prisma[Account].findUnique({
                                        where: {
                                            providerId_providerAccountId: {
                                                providerId: providerId,
                                                providerAccountId: providerAccountId,
                                            },
                                        },
                                        include: {
                                            user: true,
                                        },
                                        rejectOnNotFound: true,
                                    })];
                            case 2:
                                account = _a.sent();
                                return [2 /*return*/, account.user];
                            case 3:
                                error_2 = _a.sent();
                                logger_1.default.error("GET_USER_BY_PROVIDER_ACCOUNT_ID_ERROR", error_2);
                                return [2 /*return*/, Promise.reject(
                                    // @ts-ignore
                                    new Error("GET_USER_BY_PROVIDER_ACCOUNT_ID_ERROR", error_2))];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            }
            function updateUser(user) {
                return __awaiter(this, void 0, void 0, function () {
                    var id, name_1, email, image, emailVerified;
                    return __generator(this, function (_a) {
                        debug("UPDATE_USER", user);
                        try {
                            id = user.id, name_1 = user.name, email = user.email, image = user.image, emailVerified = user.emailVerified;
                            userCache.set(id, user);
                            // @ts-ignore
                            return [2 /*return*/, prisma[User].update({
                                    where: { id: id },
                                    data: {
                                        name: name_1,
                                        email: email,
                                        image: image,
                                        emailVerified: emailVerified ? emailVerified.toISOString() : null,
                                    },
                                })];
                        }
                        catch (error) {
                            logger_1.default.error("UPDATE_USER_ERROR", error);
                            // @ts-ignore
                            return [2 /*return*/, Promise.reject(new Error("UPDATE_USER_ERROR", error))];
                        }
                        return [2 /*return*/];
                    });
                });
            }
            function deleteUser(userId) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        userCache.del(userId);
                        debug("DELETE_USER", userId);
                        try {
                            return [2 /*return*/, prisma[User].delete({ where: { id: userId } })];
                        }
                        catch (error) {
                            logger_1.default.error("DELETE_USER_ERROR", error);
                            // @ts-ignore
                            return [2 /*return*/, Promise.reject(new Error("DELETE_USER_ERROR", error))];
                        }
                        return [2 /*return*/];
                    });
                });
            }
            function linkAccount(userId, providerId, providerType, providerAccountId, refreshToken, accessToken, accessTokenExpires) {
                return __awaiter(this, void 0, void 0, function () {
                    var error_3;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                debug("LINK_ACCOUNT", userId, providerId, providerType, providerAccountId, refreshToken, accessToken, accessTokenExpires);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, prisma[Account].create({
                                        data: {
                                            accessToken: accessToken,
                                            refreshToken: refreshToken,
                                            providerAccountId: "" + providerAccountId,
                                            providerId: providerId,
                                            providerType: providerType,
                                            accessTokenExpires: accessTokenExpires,
                                            user: { connect: { id: userId } },
                                        },
                                    })];
                            case 2: return [2 /*return*/, _a.sent()];
                            case 3:
                                error_3 = _a.sent();
                                logger_1.default.error("LINK_ACCOUNT_ERROR", error_3);
                                // @ts-ignore
                                return [2 /*return*/, Promise.reject(new Error("LINK_ACCOUNT_ERROR", error_3))];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            }
            function unlinkAccount(userId, providerId, providerAccountId) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        debug("UNLINK_ACCOUNT", userId, providerId, providerAccountId);
                        try {
                            return [2 /*return*/, prisma[Account].delete({
                                    where: {
                                        providerId_providerAccountId: {
                                            providerAccountId: providerAccountId,
                                            providerId: providerId,
                                        },
                                    },
                                })];
                        }
                        catch (error) {
                            logger_1.default.error("UNLINK_ACCOUNT_ERROR", error);
                            // @ts-ignore
                            return [2 /*return*/, Promise.reject(new Error("UNLINK_ACCOUNT_ERROR", error))];
                        }
                        return [2 /*return*/];
                    });
                });
            }
            function createSession(user) {
                return __awaiter(this, void 0, void 0, function () {
                    var expires, dateExpires, session, cachedSession;
                    return __generator(this, function (_a) {
                        debug("CREATE_SESSION", user);
                        try {
                            expires = null;
                            dateExpires = new Date();
                            dateExpires.setTime(dateExpires.getTime() + sessionMaxAge);
                            expires = dateExpires.toISOString();
                            session = {
                                expires: expires,
                                sessionToken: crypto_1.randomBytes(32).toString("hex"),
                                accessToken: crypto_1.randomBytes(32).toString("hex"),
                                user: user,
                            };
                            cachedSession = klona_1.klona(session);
                            sessionCache.set(session.sessionToken, cachedSession, maxAge(expires));
                            return [2 /*return*/, prisma[Session].create({
                                    data: {
                                        expires: expires,
                                        user: { connect: { id: user.id } },
                                        sessionToken: crypto_1.randomBytes(32).toString("hex"),
                                        accessToken: crypto_1.randomBytes(32).toString("hex"),
                                    },
                                })];
                        }
                        catch (error) {
                            logger_1.default.error("CREATE_SESSION_ERROR", error);
                            // @ts-ignore
                            return [2 /*return*/, Promise.reject(new Error("CREATE_SESSION_ERROR", error))];
                        }
                        return [2 /*return*/];
                    });
                });
            }
            function getSession(sessionToken) {
                return __awaiter(this, void 0, void 0, function () {
                    var cachedSession, session, error_4;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                debug("GET_SESSION", sessionToken);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 5, , 6]);
                                cachedSession = sessionCache.get(sessionToken);
                                if (cachedSession) {
                                    debug("GET_SESSION - Fetched from LRU Cache", cachedSession);
                                    return [2 /*return*/, cachedSession];
                                }
                                return [4 /*yield*/, prisma[Session].findUnique({
                                        where: { sessionToken: sessionToken },
                                    })];
                            case 2:
                                session = _a.sent();
                                if (!(session && session.expires && new Date() > session.expires)) return [3 /*break*/, 4];
                                return [4 /*yield*/, prisma[Session].delete({
                                        where: { sessionToken: sessionToken },
                                    })];
                            case 3:
                                _a.sent();
                                return [2 /*return*/, null];
                            case 4:
                                session &&
                                    sessionCache.set(session.sessionToken, session, maxAge(session.expires));
                                return [2 /*return*/, session];
                            case 5:
                                error_4 = _a.sent();
                                logger_1.default.error("GET_SESSION_ERROR", error_4);
                                // @ts-ignore
                                return [2 /*return*/, Promise.reject(new Error("GET_SESSION_ERROR", error_4))];
                            case 6: return [2 /*return*/];
                        }
                    });
                });
            }
            function updateSession(session, force) {
                return __awaiter(this, void 0, void 0, function () {
                    var dateSessionIsDueToBeUpdated, newExpiryDate, id, expires, error_5;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                debug("UPDATE_SESSION", session);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                if (sessionMaxAge &&
                                    (sessionUpdateAge || sessionUpdateAge === 0) &&
                                    session.expires) {
                                    dateSessionIsDueToBeUpdated = new Date(session.expires);
                                    dateSessionIsDueToBeUpdated.setTime(dateSessionIsDueToBeUpdated.getTime() - sessionMaxAge);
                                    dateSessionIsDueToBeUpdated.setTime(dateSessionIsDueToBeUpdated.getTime() + sessionUpdateAge);
                                    // Trigger update of session expiry date and write to database, only
                                    // if the session was last updated more than {sessionUpdateAge} ago
                                    if (new Date() > dateSessionIsDueToBeUpdated) {
                                        newExpiryDate = new Date();
                                        newExpiryDate.setTime(newExpiryDate.getTime() + sessionMaxAge);
                                        session.expires = newExpiryDate;
                                    }
                                    else if (!force) {
                                        return [2 /*return*/, null];
                                    }
                                }
                                else {
                                    // If session MaxAge, session UpdateAge or session.expires are
                                    // missing then don't even try to save changes, unless force is set.
                                    if (!force) {
                                        return [2 /*return*/, null];
                                    }
                                }
                                id = session.id, expires = session.expires;
                                sessionCache.set(session.sessionToken, session, maxAge(expires));
                                return [4 /*yield*/, prisma[Session].update({
                                        where: { id: id },
                                        data: { expires: expires },
                                    })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                            case 3:
                                error_5 = _a.sent();
                                logger_1.default.error("UPDATE_SESSION_ERROR", error_5);
                                // @ts-ignore
                                return [2 /*return*/, Promise.reject(new Error("UPDATE_SESSION_ERROR", error_5))];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            }
            function deleteSession(sessionToken) {
                return __awaiter(this, void 0, void 0, function () {
                    var error_6;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                debug("DELETE_SESSION", sessionToken);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                sessionCache.del(sessionToken);
                                return [4 /*yield*/, prisma[Session].delete({
                                        where: { sessionToken: sessionToken },
                                    })];
                            case 2: return [2 /*return*/, _a.sent()];
                            case 3:
                                error_6 = _a.sent();
                                logger_1.default.error("DELETE_SESSION_ERROR", error_6);
                                // @ts-ignore
                                return [2 /*return*/, Promise.reject(new Error("DELETE_SESSION_ERROR", error_6))];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            }
            function createVerificationRequest(identifier, url, token, secret, provider) {
                return __awaiter(this, void 0, void 0, function () {
                    var baseUrl, sendVerificationRequest, maxAge_1, hashedToken, expires, dateExpires, verificationRequest, error_7;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                debug("CREATE_VERIFICATION_REQUEST", identifier);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 4, , 5]);
                                baseUrl = appOptions.baseUrl;
                                sendVerificationRequest = provider.sendVerificationRequest, maxAge_1 = provider.maxAge;
                                hashedToken = crypto_1.createHash("sha256")
                                    .update("" + token + secret)
                                    .digest("hex");
                                expires = "";
                                if (maxAge_1) {
                                    dateExpires = new Date();
                                    dateExpires.setTime(dateExpires.getTime() + maxAge_1 * 1000);
                                    expires = dateExpires.toISOString();
                                }
                                return [4 /*yield*/, prisma[VerificationRequest].create({
                                        data: {
                                            identifier: identifier,
                                            token: hashedToken,
                                            expires: expires,
                                        },
                                    })];
                            case 2:
                                verificationRequest = _a.sent();
                                // With the verificationCallback on a provider, you can send an email, or queue
                                // an email to be sent, or perform some other action (e.g. send a text message)
                                return [4 /*yield*/, sendVerificationRequest({
                                        identifier: identifier,
                                        url: url,
                                        token: token,
                                        baseUrl: baseUrl,
                                        provider: provider,
                                    })];
                            case 3:
                                // With the verificationCallback on a provider, you can send an email, or queue
                                // an email to be sent, or perform some other action (e.g. send a text message)
                                _a.sent();
                                return [2 /*return*/, verificationRequest];
                            case 4:
                                error_7 = _a.sent();
                                logger_1.default.error("CREATE_VERIFICATION_REQUEST_ERROR", error_7);
                                return [2 /*return*/, Promise.reject(
                                    // @ts-ignore
                                    new Error("CREATE_VERIFICATION_REQUEST_ERROR", error_7))];
                            case 5: return [2 /*return*/];
                        }
                    });
                });
            }
            function getVerificationRequest(identifier, token, secret, provider) {
                return __awaiter(this, void 0, void 0, function () {
                    var hashedToken, verificationRequest, error_8;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                debug("GET_VERIFICATION_REQUEST", identifier, token);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 5, , 6]);
                                hashedToken = crypto_1.createHash("sha256")
                                    .update("" + token + secret)
                                    .digest("hex");
                                return [4 /*yield*/, prisma[VerificationRequest].findUnique({
                                        where: { token: hashedToken },
                                    })];
                            case 2:
                                verificationRequest = _a.sent();
                                if (!(verificationRequest &&
                                    verificationRequest.expires &&
                                    new Date() > verificationRequest.expires)) return [3 /*break*/, 4];
                                // Delete verification entry so it cannot be used again
                                return [4 /*yield*/, prisma[VerificationRequest].delete({
                                        where: { token: hashedToken },
                                    })];
                            case 3:
                                // Delete verification entry so it cannot be used again
                                _a.sent();
                                return [2 /*return*/, null];
                            case 4: return [2 /*return*/, verificationRequest];
                            case 5:
                                error_8 = _a.sent();
                                logger_1.default.error("GET_VERIFICATION_REQUEST_ERROR", error_8);
                                return [2 /*return*/, Promise.reject(
                                    // @ts-ignore
                                    new Error("GET_VERIFICATION_REQUEST_ERROR", error_8))];
                            case 6: return [2 /*return*/];
                        }
                    });
                });
            }
            function deleteVerificationRequest(identifier, token, secret, provider) {
                return __awaiter(this, void 0, void 0, function () {
                    var hashedToken, error_9;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                debug("DELETE_VERIFICATION", identifier, token);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                hashedToken = crypto_1.createHash("sha256")
                                    .update("" + token + secret)
                                    .digest("hex");
                                return [4 /*yield*/, prisma[VerificationRequest].delete({
                                        where: { token: hashedToken },
                                    })];
                            case 2:
                                _a.sent();
                                return [3 /*break*/, 4];
                            case 3:
                                error_9 = _a.sent();
                                logger_1.default.error("DELETE_VERIFICATION_REQUEST_ERROR", error_9);
                                return [2 /*return*/, Promise.reject(
                                    // @ts-ignore
                                    new Error("DELETE_VERIFICATION_REQUEST_ERROR", error_9))];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            }
            var defaultSessionMaxAge, sessionMaxAge, sessionUpdateAge;
            return __generator(this, function (_c) {
                if (appOptions && (!appOptions.session || !appOptions.session.maxAge)) {
                    debug("GET_ADAPTER", "Session expiry not configured (defaulting to 30 days");
                }
                defaultSessionMaxAge = 30 * 24 * 60 * 60 * 1000;
                sessionMaxAge = ((_a = appOptions === null || appOptions === void 0 ? void 0 : appOptions.session) === null || _a === void 0 ? void 0 : _a.maxAge) ? appOptions.session.maxAge * 1000
                    : defaultSessionMaxAge;
                sessionUpdateAge = ((_b = appOptions === null || appOptions === void 0 ? void 0 : appOptions.session) === null || _b === void 0 ? void 0 : _b.updateAge) ? appOptions.session.updateAge * 1000
                    : 0;
                // @ts-ignore
                return [2 /*return*/, Promise.resolve({
                        createUser: createUser,
                        getUser: getUser,
                        getUserByEmail: getUserByEmail,
                        getUserByProviderAccountId: getUserByProviderAccountId,
                        updateUser: updateUser,
                        deleteUser: deleteUser,
                        linkAccount: linkAccount,
                        unlinkAccount: unlinkAccount,
                        createSession: createSession,
                        getSession: getSession,
                        updateSession: updateSession,
                        deleteSession: deleteSession,
                        createVerificationRequest: createVerificationRequest,
                        getVerificationRequest: getVerificationRequest,
                        deleteVerificationRequest: deleteVerificationRequest,
                    })];
            });
        });
    }
    return {
        getAdapter: getAdapter,
    };
}
exports.default = PrismaAdapter;
