interface Channels {
    [channelName: string]: string;
}

interface Roles {
    [roleName: string]: string;
}

export function getChannels(guildId: string | undefined) : Channels {
    if (guildId === undefined) {
        //command run outside a guild
        return {

        }
    }
    
    if (guildId === '1370324695324561439') {
        //Nex Angel of Death Bot Testing
        return {
            achievementsAndLogs: '1370324698902171683',
            botRoleLog: '1370324703121510415',
            naMock: '1370324700382761004',
            naTrial: '1370324700382761004',
            euMock: '1370324700382761003',
            euTrial: '1370324700382761003',
            mockResult: '1370324700382761005',
            trialResult: '1370324700382761005',
            mockInfo: '1370324701452177445',
        }
    }

    if (guildId === '315710189762248705') {
        //Nex, Angel of Death
        return {
            achievementsAndLogs: '1058373790289109092',
            botRoleLog: '1058373508314431528',
            naMock: '954775172609630218',
            naTrial: '954775172609630218',
            euMock: '765479967114919937',
            euTrial: '765479967114919937',
            mockResult: '702083377066410002',
            trialResult: '702083377066410002',
            mockInfo: '1068881120319504486',
        }
    }    

    //unknown guild
    return {

    }
}

export function getRoles(guildId: string | undefined) : Roles {
    if (guildId === undefined) {
        //command run outside a guild
        return {

        }
    }

    if (guildId === '1370324695324561439') {
        //Nex Angel of Death Bot Testing
        return {
            trialHost: '<@&1370324695882141753>',
            organizer: '<@&1370324696033263648>',
            admin: '<@&1370324696033263650>',
            owner: '<@&1370324696033263651>',
            kc10k: '<@&1370324695425220695>',
            kc20k: '<@&1370324695425220696>',
            kc30k: '<@&1370324695425220697>',
            kc40k: '<@&1370324695458517072>',
            kc50k: '<@&1370324695458517073>',
            kc60k: '<@&1370324695458517074>',
            kc70k: '<@&1370324695458517075>',
            kc80k: '<@&1370324695458517076>',
            kc90k: '<@&1370324695458517077>',
            kc100k: '<@&1370324695458517078>',
            ofThePraesul: '<@&1370324695425220689>',
            goldenPraesul: '<@&1370324695425220690>',
            trialee: '<@&1370324695345528878>',
            magicMT: '<@&1370324695383150684>',
            magicBase: '<@&1370324695383150685>',
            rangeMT: '<@&1370324695362048089>',            
            rangeBase: '<@&1370324695383150683>',
            chinner: '<@&1370324695383150682>',
            meleeMT: '<@&1370324695362048087>',
            meleeFree: '<@&1370324695362048085>',
            meleeBase: '<@&1370324695362048088>',
            meleeUmbra: '<@&1370324695362048086>',
            mrMT: '<@&1370324695383150686>',
            mrHammer: '<@&1370324695383150687>',
            mrBase: '<@&1370324695383150688>',
            trialTeam: '<@&1370324695513174024>',
            trialTeamProbation: '<@&1370324695425220691>',
            applicationTeam: '<@&1370324695676620815>',
            sevenMan: '<@&1370324695425220693>',
            pingNA: '<@&1370324695362048082>',
            pingEU: '<@&1370324695362048083>',
            pingOffHour: '<@&1370324695362048081>',
            nexAodFCMember: '<@&1370324695362048084>',
            mvp: '<@&1370324695676620817>',
            necroMT: '<@&1370324695383150689>',
            necroBase: '<@&1370324695383150691>',
            necroHammer: '<@&1370324695383150690>',
            fourMan: '<@1370324695425220692>',
            fallenAngel: '<@&1370324695513174023>',
            nightmareOfNihils: '<@&1370324695546855557>',
            elementalist: '<@&1370324695513174020>',
            sageOfElements: '<@&1370324695513174021>',
            masterOfElements: '<@&1370324695513174022>',
            smokeDemon: '<@&1370324695513174016>',
            shadowCackler: '<@&1370324695458517079>',
            truebornVampyre: '<@&1370324695458517081>',
            glacyteOfLeng: '<@&1370324695458517080>',
            praetorianLibrarian: '<@&1370324695513174017>',
            coreRupted: '<@&1370324695513174018>',
            ollivandersSupplier: '<@&1370324695513174019>',
            colour_fourMan: '<@&1370324695731277878>',
            colour_sevenMan: '<@&1370324695731277879>',                
            colour_fallenAngel: '<@&1370324695810838613>', 
            colour_nightmareOfNihils: '<@&1370324695810838615>', 
            colour_elementalist: '<@&1370324695810838610>', 
            colour_sageOfElements: '<@&1370324695810838611>',
            colour_masterOfElements: '<@&1370324695810838612>', 
            colour_smokeDemon: '<@&1370324695773347868>', 
            colour_shadowCackler: '<@&1370324695773347865>', 
            colour_truebornVampyre: '<@&1370324695773347867>', 
            colour_glacyteOfLeng: '<@&1370324695773347866>', 
            colour_praetorianLibrarian: '<@&1370324695773347869>', 
            colour_coreRupted: '<@&1370324695773347870>', 
            colour_ollivandersSupplier: '<@&1370324695810838609>',
            colour_ofThePraesul: '<@&1370324695731277876>', 
            colour_goldenPraesul: '<@&1370324695731277877>',
            colour_trialTeam: '<@&1370324695810838614>',
            colour_kc10k: '<@&1370324695731277880>',
            colour_kc20k: '<@&1370324695731277881>',
            colour_kc30k: '<@&1370324695731277882>',
            colour_kc40k: '<@&1370324695731277883>',
            colour_kc50k: '<@&1370324695731277884>',
            colour_kc60k: '<@&1370324695731277885>',
            colour_kc70k: '<@&1370324695773347861>',
            colour_kc80k: '<@&1370324695773347862>',
            colour_kc90k: '<@&1370324695773347863>',
            colour_kc100k: '<@&1370324695773347864>',
            colour_nexAodFCMember: '<@&1370324695676620819>',
            greenSanta: '<@&1370324695961964554>',
            redSanta: '<@&1370324696033263646>',
            purpleSanta: '<@&1370324695961964553>',
            blueSanta: '<@&1370324695961964552>',
            pinkSanta: '<@&1370324695961964551>',
            blackSanta: '<@&1370324695961964550>',
            editor: '<@&1370324695676620818>',
        }
    }

    if (guildId === '315710189762248705') {
        //Nex, Angel of Death
        return {
            trialHost: '<@&635646418123751434>',
            organizer: '<@&374393957645287426>',
            admin: '<@&315714278940213258>',
            owner: '<@&722641577733914625>',
            kc10k: '<@&963277353927204864>',
            kc20k: '<@&963277215955583066>',
            kc30k: '<@&963276930910666752>',
            kc40k: '<@&963276807702982676>',
            kc50k: '<@&963276584775720980>',
            kc60k: '<@&962002662616858785>',
            kc70k: '<@&1020821253155721226>',
            kc80k: '<@&1156365536746274886>',
            kc90k: '<@&1179145482061230231>',
            kc100k: '<@&1262896895202820168>',
            ofThePraesul: '<@&474307399851835414>',
            goldenPraesul: '<@&589268459502960642>',
            trialee: '<@&666034554150322200>',
            magicMT: '<@&1063137065673429022>',
            magicBase: '<@&1063137403998589108>',
            rangeMT: '<@&1063136067949178960>',
            rangeBase: '<@&1063136409621377024>',
            chinner: '<@&1063136286325616730>',
            meleeMT: '<@&926622693908946974>',
            meleeFree: '<@&926623795475787807>',
            meleeBase: '<@&926623603150164008>',
            meleeUmbra: '<@&934920368441938012>',
            mrMT: '<@&1021475735128506421>',
            mrHammer: '<@&1021479839003312168>',
            mrBase: '<@&1021476019284213860>',
            trialTeam: '<@&469546608531472385>',
            trialTeamProbation: '<@&1074057253314908190>',
            applicationTeam: '<@&968901102911246377>',
            sevenMan: '<@&337723869508927489>',
            pingNA: '<@&959522928247066664>',
            pingEU: '<@&959522492593098762>',
            pingOffHour: '<@&959523032672641055>',
            nexAodFCMember: '<@&644269097558867968>',
            mvp: '<@&1121739029583511614>',
            necroMT: '<@&1142304685546537062>',
            necroBase: '<@&1142304996495470682>',
            necroHammer: '<@&1149840318053757032>',
            fourMan: '<@&1226182671663763466>',
            fallenAngel: '<@&1243319612632727602>',
            nightmareOfNihils: '<@&1243319682669351003>',
            elementalist: '<@&1243319748314267648>',
            sageOfElements: '<@&1243319812428533893>',
            masterOfElements: '<@&1243319871618678784>',
            smokeDemon: '<@&1243319946176630805>',
            shadowCackler: '<@&1243320011389534209>',
            truebornVampyre: '<@&1243320074660614185>',
            glacyteOfLeng: '<@&1243320133968203857>',
            praetorianLibrarian: '<@&1243320189211377685>',
            coreRupted: '<@&1243337593882542222>',
            ollivandersSupplier: '<@&1243337779039965234>',
            colour_fourMan: '<@&1262092410981318696>',
            colour_sevenMan: '<@&1262092300314480791>',                
            colour_fallenAngel: '<@&1262090273538969682>', 
            colour_nightmareOfNihils: '<@&1262089742804189255>', 
            colour_elementalist: '<@&1262090603924164639>', 
            colour_sageOfElements: '<@&1262090529236189236>',
            colour_masterOfElements: '<@&1262090418267488357>', 
            colour_smokeDemon: '<@&1262091008037093460>', 
            colour_shadowCackler: '<@&1262091258843893900>', 
            colour_truebornVampyre: '<@&1262091083349885140>', 
            colour_glacyteOfLeng: '<@&1262091186848399360>', 
            colour_praetorianLibrarian: '<@&1262090933252395099>', 
            colour_coreRupted: '<@&1262090829212946594>', 
            colour_ollivandersSupplier: '<@&1262090691329261620>',
            colour_ofThePraesul: '<@&1262092579541876749>', 
            colour_goldenPraesul: '<@&1262092501112721498>',
            colour_trialTeam: '<@&1262090165221064755>',
            colour_kc10k: '<@&1262092205330272286>',
            colour_kc20k: '<@&1262092138821455894>',
            colour_kc30k: '<@&1262092060463464449>',
            colour_kc40k: '<@&1262091795840503928>',
            colour_kc50k: '<@&1262091695202504846>',
            colour_kc60k: '<@&1262091626755391529>',
            colour_kc70k: '<@&1262091554453979197>',
            colour_kc80k: '<@&1262091484090470440>',
            colour_kc90k: '<@&1262091366163415051>',
            colour_kc100k: '<@&1262896950756507741>',
            colour_nexAodFCMember: '<@&1262092653944639498>',
            greenSanta: '<@&1311081343999803484>',
            redSanta: '<@&1311082311147589666>',
            purpleSanta: '<@&1311082972149055609>',
            blueSanta: '<@&1311083272012566629>',
            pinkSanta: '<@&1311083772078325861>',
            blackSanta: '<@&1311084184152047709>',
            editor: '<@&1246805554089820201>',
        }
    }

    if (guildId === '742114133117501570') {
        //Nex Aod FC
        return {
            trialHost: '<@&742114133419491395>',
            organizer: '<@&742114133419491396>',
            admin: '<@&742114133419491397>', //same as owner
            owner: '<@&742114133419491397>',
            editor: '<@742114133419491397>', //same as owner
        }
    }

    //unknown guild
    return {

    }
}

export function getMvpRole(guildId: string | undefined, userId: string) : string | undefined {
    if (guildId === undefined) {
        //command run outside a guild
        return;
    }
    
    if (guildId === '1370324695324561439') {
        //Nex Angel of Death Bot Testing
        const data: any = {
            // Rocket
            '259011909976719360': '1370324695844388910',
            // Marwood
            '512006696005140492': '1370324695844388911',
            // Jamie
            '128454764345294848': '1370324695844388909',
            // Patze
            '581918864296771595': '1370324695844388908',
            // geherman
            '197736922725089280': '1370324695844388907',
            // Seispip
            '257467891090325506': '1370324695844388906',
            // Friendliness
            '116331205653299201': '1370324695844388905',
            // Veggie
            '185208032605503488': '1370324695810838618',
            // Hells
            '406876547283157004': '1370324695844388913',
            // Germa
            '287634146010988544': '1370324695844388914',
            // Mike
            '238477706214244352': '1370324695810838616',
            // Logging in/Riley
            '205529505421328385': '1370324695861428244',
            // Fate
            '258055326215962626': '1370324695810838617',
            // Neon
            '192410030216183820': '1370324695844388912',
        }
        return data[userId];
    }

    if (guildId === '315710189762248705') {
        //Nex, Angel of Death
        const data: any = {
            // Rocket
            '259011909976719360': '1121741706765795440',
            // Marwood
            '512006696005140492': '1121739075662139403',
            // Jamie
            '128454764345294848': '1121741768145248326',
            // Patze
            '581918864296771595': '1121741858536697897',
            // geherman
            '197736922725089280': '1121742064518955088',
            // Seispip
            '257467891090325506': '1121742127496441936',
            // Friendliness
            '116331205653299201': '1121742484192645120',
            // Veggie
            '185208032605503488': '1121755553547427852',
            // Hells
            '406876547283157004': '1063311303478878318',
            // Germa
            '287634146010988544': '1063310756650680321',
            // Mike
            '238477706214244352': '1063310962419048458',
            // Logging in/Riley
            '205529505421328385': '905494614025326672',
            // Fate
            '258055326215962626': '1121748189876334612',
            // Neon
            '192410030216183820': '1156688424871399455',
        }
        return data[userId];
    }

    //unknown guild
    return;
}