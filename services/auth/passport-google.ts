// import passport from "passport";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// import {v4 as uuidv4} from "uuid";
// import config from "../../config/auth";
// import { Customer } from "../database/schema/customer";

// passport.use(
//     new GoogleStrategy(
//         {
//             clientID: config.google.clientID || (() => { throw new Error("Google clientID is not defined in config"); })(),
//             clientSecret: config.google.clientSecret || (() => { throw new Error("Google clientSecret is not defined in config"); })(),
//             callbackURL: config.google.callbackURL,
//             scope: ["profile", "email"],
//         },
//         async (accessToken, refreshToken, profile, done) => {
//             try{
//                 const exstingUser = await Customer.findOne({
//                     googleId: profile.id,
//                 });

//                 if (exstingUser) {
//                     return done(null, exstingUser);
//                 }

//                 const emailUser = await Customer.findOne({
//                     email: profile.emails?.[0]?.value,
//                 })
//                 if (emailUser){
//                     emailUser.googleId = profile.id;
//                     await emailUser.save();
//                     return done(null, emailUser);
//                 }

//                 const newUser = new Customer({
//                     id: uuidv4(),
//                     username: profile.displayName,
//                     email: profile.emails?.[0]?.value ?? null,
//                     phoneNumber: null, // Google profile does not include phoneNumber
//                     googleId: profile.id,
//                     role: "CUSTOMER"
//                 });
//                 await newUser.save();
//                 return done(null, newUser);
//             }catch (error) {
//                 console.error("Error in Google strategy:", error);
//                 return done(error, false);
//             }
//         }
//     )
// );
// passport.serializeUser((user, done) => {
//     done(null, user);
// });

// passport.deserializeUser((async (id, done) => {
//     try{
//         const user = await Customer.findOne({id});
//         done(null, user);
//     }catch(error) {
//         console.error("Error in deserializeUser:", error);
//         done(error, null);
//     }
// }));

// export default passport;