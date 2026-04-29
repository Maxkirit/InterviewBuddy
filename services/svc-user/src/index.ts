import express from 'express'

const app= express;
const port = 3000;

app.get('api/v1/matchUserId', async (req, res) =>{
	const {auth_id} = req.query;
	
})