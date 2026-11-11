const clients = new Map();

export function addNotificationClient(userId, res) {
  const id = Number(userId);

  if (!clients.has(id)) {
    clients.set(id, new Set());
  }

  clients.get(id).add(res);

  res.write('event: connected\n');
  res.write('data: {}\n\n');

  res.on('close', () => {
    const userClients = clients.get(id);

    if (!userClients) return;

    userClients.delete(res);

    if (userClients.size === 0) {
      clients.delete(id);
    }
  });
}

export function sendNotificationToUser(userId, notification) {
  const userClients = clients.get(Number(userId));

  if (!userClients) return;

  const data = JSON.stringify(notification);

  for (const client of userClients) {
    client.write(`event: notification\n`);
    client.write(`data: ${data}\n\n`);
  }
}