const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('./db.json')
const db = low(adapter)


db.defaults({ users: [], questions: [] })
    .write()

const Discord = require('discord.js');
const bot = new Discord.Client();

let bot_channel_id = '665226913291436085'
let acces_query_cmd = '//access'
let number_of_query_to_resolve = 5;
let minimal_points_to_get_accepted = 4;


// pour charger le token
let config = require('./config.json')


/*
user : {
    str: id,
    str: futur_valid_response
    int: question_counter,   [1; 5]
    int: good_answer_counter,
    bool is_validated,
    int start_challenge_timestamp,
    bool is_doing_challenge,
    int attempt
}
*/



function get_user_object(user_id) {
    return db.get('users')
        .find({ id: user_id })
}

function get_user(user_id) {
    return db.get('users')
        .find({ id: user_id })
        .value()
}

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
        let updated_user = get_user(id)
        update_user.attempt = update_user.attempt + 1

        update_user(id, updated_user)
    }
}



function generate_str_query() {
    let new_query = {
        question: '5+5  = ',
        response: '10'
    }
    return new_query
}



function update_user(user_id, new_user) {
    db.get('users')
        .find({ id: user_id })
        .assign(new_user)
        .value()
}



function public_log(message) {
    let channel = bot.channels.get(bot_channel_id).send(message)
}



// pour la première question
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
    console.log(db_user)
    console.log('----------')
    console.log(db_user_obj)

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
function manage(user, msg) {
    let db_user = get_user(user.id)
    // si l'uttilisateur n'existe pas
    if (db_user == undefined) {
        reset_user(user.id)        // on crée l'uttilisateur dans la db
        first_query(user)
    }
    //   si l'uttilisateur exiset mais n'as jamais réalisé de test ou à échoué à son dernier test
    else if (db_user == undefined && db_user.query_counter == 0) {
        reset_user(user.id)        // on crée l'uttilisateur dans la db
        first_query(user)

    } 
    // si l'uttilisateur est entrain de passer le test
    else if (db_user.query_counter < number_of_query_to_resolve) {
        query(user.id, msg)     // ça check la dernière réponse et en demande une autre
    } else if ((db_user.query_counter == number_of_query_to_resolve)) {
        if (db_user.points >= minimal_points_to_get_accepted) {
            public_log(`${user} à reussit le test d'entrée au bout de ${db_user.attempt} tentative`)
        } else {
            public_log(`${user} à échoué au test d'entrée (tentative n°${db_user.attempt}`)
        }
        // mtn il faut reset le mec dans la db
        reset_user(user.id)
    }

}



bot.on('ready', () => {
    console.log(`script started on ${bot.user.tag}!`);
});



bot.on('message', msg => {
    let user_id = msg.author.id
    if (msg.content == acces_query_cmd && msg.channel.id == bot_channel_id) {
        public_log(`${msg.author} à lancé le test d'entrée`)
        manage(msg.author, '')
    }


    // pour récupéré les réponses en messages privées
    if (msg.channel.type == 'dm' && (get_user(user_id) != undefined)) {
        manage(msg.author, msg.content)
    }
});



bot.login(config.token);