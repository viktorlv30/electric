import { Component, Inject } from "@nestjs/common";
import { Model } from "mongoose";
import { IUser } from "./interfaces/user.interface";

@Component()
export class UsersService {
    constructor(@Inject('UserModelToken') private readonly userModel: Model<IUser>) { }

    async create(user: Partial<IUser>): Promise<Partial<IUser>> {
        const createdUser = new this.userModel(user);
        return await createdUser.save();
    }

    async findAll(): Promise<Partial<IUser>[]> {
        let users = this.userModel.find().exec();
        return await users;
    }

    /**
     * @return true - if success deleted or false if error occurs
     */
    async deleteAll(): Promise<boolean> {
        let operation = new Promise<boolean>((resolve, reject) => {
            this.userModel.collection.deleteMany({}, (err) => {
                if (err) {
                    console.warn(`Error during remove all entries from collection ${err}`);
                    resolve(false);
                }
                resolve(true);
            });
        });
        let result = await operation;
        return result;
    }
}
