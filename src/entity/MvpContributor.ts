import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column } from "typeorm"

@Entity()
export class MvpContributor {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    guild: string

    @Column()
    user: string

    @Column()
    role: string

    @CreateDateColumn({ name: 'created_at'})
    createdAt: Date;
}
