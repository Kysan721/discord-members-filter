const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('./db.json')
const db = low(adapter)


db.defaults({ users: [], questions: [] })
    .write()

const Discord = require('discord.js');
const bot = new Discord.Client();

// à mettre dans le bot_config.json
let guild_id = '665226913291436082'
let bot_channel_id = '665226913291436085'
let acces_query_cmd = '//access'
let number_of_query_to_resolve = 5
let minimal_points_to_get_accepted = 4
let validated_member_role_id = '665256238585479176'



// pour charger le token
let config = require('./config.json')

function get_user_object(user_id) {
    return db.get('users')
        .find({ id: user_id })
}

function get_user(user_id) {
    return db.get('users')
        .find({ id: user_id })
        .value()
}


// crée un nouvelle uttilistateur dans la db / remet les champs nécéssaire au test à 0 
function reset_user(id) {
    // nouvel uttilisateur non enregistré 
    if (get_user(id) == undefined) {
        let new_user = {
            id: id,
            futur_valid_response: '',
            query_counter: 0,
            points: 0,
            attempt: 0,
            start_timestamp: Date.now(),
            is_validated: false,
        }
        db.get('users')
            .push(new_user)
            .write()
    } else {
        // uttilisateur déjà entregistré
        get_user_object(id)
            .assign({
                id: id,
                futur_valid_response: '',
                query_counter: 0,
                points: 0,
                attempt: ++get_user(id).attempt,
                start_timestamp: Date.now(),
                is_validated: get_user(id).is_validated,
            }).write()
    }
}


// pour la génération des questions
function generate_str_query() {
    let new_query = {
        question: '5+5=?',
        response: '10'
    }
    return new_query
}


function approve_user(discord_user) {
    let guild = bot.guilds.get(guild_id)
    let validated_member_role = guild.roles.find('name', 'validé')
    discord_user.addRole(validated_member_role).catch(console.error)
}


function public_log(message) {
    // rajouter un embed
    let channel = bot.channels.get(bot_channel_id).send(message)
}


// pour la toues première question qui necéssite pas la validation la vérification de la réponse à la question posé précédement
function first_query(discord_user) {
    let db_user_obj = get_user_object(discord_user.id)
    let db_user = get_user(discord_user.id)

    db_user_obj.assign({ attempt: ++db_user.attempt }).write()        // met à jours le nombre d'essais

    // on crée la nouvelle question
    let query = generate_str_query()

    db_user_obj.assign({ futur_valid_response: query.response }).write()      // on enregistre la future réponse valide
    db_user_obj.assign({ query_counter: ++db_user.query_counter }).write()    // on incrémente le compteur de question posé

    discord_user.send(query.question)          // on lui envoie la question
}




function query(discord_user, response) {
    let db_user_obj = get_user_object(discord_user.id)
    let db_user = get_user(discord_user.id)

    if (response == db_user.futur_valid_response) {
        db_user_obj.assign({ points: ++db_user.points }).write() // on ajoute un point au l'uttilisateur
    }

    db_user_obj.assign({ query_counter: ++db_user.query_counter }).write()    // on incrémente le compteur de question posé

    // on crée la nouvelle question
    let query = generate_str_query()
    // on enregistre la future réponse valide
    db_user_obj.assign({ futur_valid_response: query.response }).write()

    // on lui envoie la question prochaine question
    discord_user.send('nouvelle question')
    discord_user.send(query.question)

}



// gère l'uttilisateur
function manage_channel_msg(user) {
    let db_user = get_user(user.id)
    // si l'uttilisateur n'existe pas
    if (db_user == undefined || db_user.query_counter == 0) {
        reset_user(user.id)        // on crée l'uttilisateur dans la db
        first_query(user)
    }
}


function manage_dm(user, msg) {
    let db_user = get_user(user.id)

    // si l'uttilisateur est entrain de passer le test
    if (db_user.query_counter < number_of_query_to_resolve && db_user.query_counter > 0) {
        query(user, msg)     // ça check la dernière réponse et en demande une autre
    }

    else if ((db_user.query_counter == number_of_query_to_resolve)) {

        if (db_user.points >= minimal_points_to_get_accepted) {
            get_user_object(user.id).assign({ is_validated: true }).write()
            approve_user(user)

            let embed = new Discord.RichEmbed()
                .setColor("#7bd039")
                .setTitle(`✅ Success:`)
                .setDescription(`${user} à reussit le test d'entrée au bout de ${db_user.attempt} tentative`)
            public_log(embed)
        } else {
            let embed = new Discord.RichEmbed()
                .setColor("#dd2e44")
                .setTitle(`❌ Fail:`)
                .setDescription(`${user} à échoué au test d'entrée avec le score de ${db_user.points}/${number_of_query_to_resolve} (tentative n°${db_user.attempt})`)
            public_log(embed)
        }
        reset_user(user.id)     // on reset l'user dans la db
    }
}


bot.on('ready', () => {
    console.log(`script started on ${bot.user.tag}!`);
});


bot.on('message', msg => {
    // pour initialiser le test
    console.log(msg.content)
    if (msg.content == acces_query_cmd && msg.channel.id == bot_channel_id) {
        msg.delete()
        let embed = new Discord.RichEmbed()
        .setColor("#7bd039")
        .setTitle(`♻️ tri en cours:`)
        .setDescription(`${msg.author} viens de lancer le test d'entrée`)
        public_log(embed)
        manage_channel_msg(msg.author)
        
    }

    // pour récupéré les réponses en messages privées des uttilisateurs entrain de faire le test
    if (msg.channel.type == 'dm' && get_user(msg.author.id) != undefined) {
        manage_dm(msg.author, msg.content)
    }
});



bot.login(config.token);