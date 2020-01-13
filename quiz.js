module.exports = {
    generateur_question_exemple_1: function () {
        let a = Math.random()
        let b = Math.random()

        let new_query = {
            question: `${a}+${b}=?`,
            response: (a + b).toString()
        }
        return new_query
    },
    generateur_question_exemple_2: function() {
        return {question: '1', response: '1'}
    }
}