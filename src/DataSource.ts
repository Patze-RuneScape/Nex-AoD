import "reflect-metadata"
import { DataSource } from "typeorm"
import { Override } from "./entity/Override"
import { Trial } from "./entity/Trial"
import { TrialParticipation } from "./entity/TrialParticipation"
import { MvpContributor } from "./entity/MvpContributor"
import { MessageShortcut } from "./entity/MessageShortcut"

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "db.sqlite",
    synchronize: true,
    logging: false,
    entities: [Override, Trial, TrialParticipation, MvpContributor, MessageShortcut],
})
